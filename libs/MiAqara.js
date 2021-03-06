const dgram = require('dgram');
const { EventEmitter } = require('events');
const DeviceHelper = require('./DeviceHelper');
const GatewayHelper = require('./GatewayHelper');
const DevicesMapHelper = require('./DevicesMapHelper');
const DeviceParser = require('./DeviceParser');
const utils = require('./utils');

const defaultConfig = {
    iv: Buffer.from([
        0x17,
        0x99,
        0x6d,
        0x09,
        0x3d,
        0x28,
        0xdd,
        0xb3,
        0xba,
        0x69,
        0x5a,
        0x2e,
        0x6f,
        0x58,
        0x56,
        0x2e,
    ]),
    multicastAddress: '224.0.0.50',
    multicastPort: 4321,
    serverPort: 9898,
    bindAddress: '', // SDK所在设备具有多网络时需要设置
    logLevel: utils.defaultLogLevel,
};

class MiAqara extends EventEmitter {
    /**
     * @param gateways 网关列表，支持数组或对象
     * @param opts 服务配置信息
     * */
    constructor(gateways, opts) {
        super();

        if (!Array.isArray(gateways) && !utils.isObject(gateway)) {
            throw new Error('Bad parameters');
        }

        // 服务配置信息
        opts = opts ? Object.assign({}, defaultConfig, opts) : defaultConfig;
        this.logger = utils.logger(opts.logLevel);
        this.multicastAddress = opts.multicastAddress;
        this.multicastPort = opts.multicastPort;
        this.serverPort = opts.serverPort;
        this.bindAddress = opts.bindAddress;

        // 读取设备计数
        this.readCount = 0;
        this.ready = false;

        // 事件
        if (opts.onReady) {
            this.on('ready', opts.onReady);
        }
        if (opts.onMessage) {
            this.on('message', opts.onMessage);
        }

        this.devicesMapHelper = new DevicesMapHelper();
        this.gatewayHelper = new GatewayHelper(this);
        this.deviceHelper = new DeviceHelper(this);
        this.parser = DeviceParser;

        if (Array.isArray(gateways)) {
            for (const gateway of gateways) {
                this.gatewayHelper.addOrUpdate({
                    iv: gateway.iv || defaultConfig.iv,
                    sid: gateway.sid,
                    password: gateway.password,
                });
            }
        } else {
            this.gatewayHelper.addOrUpdate({
                iv: gateways.iv || defaultConfig.iv,
                sid: gateways.sid,
                password: gateways.password,
            });
        }
    }

    start() {
        // 初始化SDK
        this.createSocket();
        this.initServerSocket();
        this.sendWhoisCommand();
    }

    stop() {
        this.serverSocket.close();
    }

    createSocket() {
        this.serverSocket = dgram.createSocket({
            type: 'udp4',
            reuseAddr: true,
        });
    }

    initServerSocket() {
        const serverSocket = this.serverSocket;

        serverSocket.on('error', (err) => {
            this.logger.error(`socket error: ${err.toString()}`);
            this.emit('error', err);
        });

        serverSocket.on('listening', () => {
            this.logger.info(`server is listening on port ${this.serverPort}.`);
            if (!this.bindAddress) {
                serverSocket.addMembership(this.multicastAddress);
            } else {
                try {
                    serverSocket.setMulticastInterface(this.bindAddress);
                    serverSocket.addMembership(
                        this.multicastAddress,
                        this.bindAddress
                    );
                } catch(err) {
                    this.logger.error(`socket error: ${err.toString()}`);
                    this.emit('error', err);
                }
            }
        });
        serverSocket.on('message', (msg) => this.parseMessage(msg));

        serverSocket.bind(this.serverPort);
    }

    parseMessage(msg) {
        let data;
        try {
            data = JSON.parse(msg); // msg is a Buffer
            if (data.hasOwnProperty('data')) {
                data.data = JSON.parse(data.data);
            }
        } catch (e) {
            this.logger.error('bad message');
            this.logger.debug(`payload: ${msg.toString('hex')}`);
            return;
        }
        let cmd = data['cmd'];
        this.logger.debug(`[Message] cmd: ${cmd}, msg: ${msg.toString()}`);

        if (cmd === 'iam') {
            // whois callback
            this.gatewayHelper.updateBySid(data.sid, data);
            this.gatewayHelper.getIdList(data.sid); // 更新子设备列表
        } else if (cmd === 'get_id_list_ack') {
            // get_id_list callback
            this.gatewayHelper.updateBySid(data.sid, data);
            this.devicesMapHelper.addOrUpdate(data.sid, data.data); // 更新网关与子设备的映射关系
            this.deviceHelper.readAll(data.data); // 批量读取子设备详细信息
            this.readCount += data.data.length;
        } else if (cmd === 'report') {
            // 设备状态上报
            this._addOrUpdate(data);
        } else if (cmd === 'read_ack') {
            // read callback
            this._addOrUpdate(data);
            this.readCount--;
            if (this.readCount === 0 && !this.ready) {
                this.ready = true;
                // 所有设备读取完毕，触发onRead事件
                this.emit('ready');
            }
        } else if (cmd === 'write_ack') {
            // write callback
            this._addOrUpdate(data);
        } else if (cmd === 'server_ack') {
            // 网关通用回复, 如发送报文JSON解析出错，会回复此事件
            // todo
        } else if (cmd === 'heartbeat') {
            // 心跳包
            /**
             * 网关每10秒钟发送一次, 主要更新网关token
             * 子设备心跳，插电设备10分钟发送一次，其它1小时发送一次
             * */
            this._addOrUpdate(data);
        }

        this.emit('message', data);
    }

    _addOrUpdate(data) {
        if (!data) {
            return;
        }
        if (data['model'] === 'gateway') {
            // 网关
            this.gatewayHelper.updateBySid(data.sid, data);
        } else {
            // 子设备
            this.deviceHelper.addOrUpdate(data);
            if (data.cmd === 'report' || data.cmd === 'heartbeat') {
                const gw = this.devicesMapHelper.getGatewaySidByDeviceSid(data.sid);
                if (!gw) {
                    // update gateway devices list
                    this.sendWhoisCommand();
                }
            }
        }
    }

    /**
     * 消息发送
     * @param {String} ip
     * @param {String} port
     * @param {Object} msg 消息对象
     * */
    send(ip, port, msg) {
        if (!ip || !port || !msg) {
            throw new Error('Bad parameters');
        }
        let msgStr = utils.messageFormat(msg, this.logger);
        this.logger.debug(`[Send] msg: ${msgStr}`);
        this.serverSocket.send(msgStr, 0, msgStr.length, port, ip);
    }

    /**
     * 网关设备发现（设备发现不加密）
     * 组播方式
     * */
    sendWhoisCommand() {
        this.logger.warn('send whois');
        this.send(this.multicastAddress, this.multicastPort, {
            cmd: 'whois',
        });
    }
}

module.exports = MiAqara;
