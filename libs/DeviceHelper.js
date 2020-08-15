/**
 * 子设备 & 传感器设备辅助类
 * */
const { inspect } = require('util');
const Device = require('./Device');
const utils = require('./utils');

class DeviceHelper {
    constructor(platform) {
        if (!platform) {
            throw new Error('Bad parameters');
        }
        this.devices = new Map();
        this.platform = platform;
    }

    add(device) {
        if (!device || !device.sid || this.devices.has(device.sid)) {
            return;
        }
        this.devices.set(device.sid, device);
    }

    addOrUpdate(data) {
        if (!data) {
            this.platform.logger.warn(
                '[DeviceHelper:addOrUpdate] data is null'
            );
            return;
        }
        const sid = data.sid;
        const nameInfo = this.platform.parser.getNameByModel(data.model);
        if (this.devices.has(sid)) {
            const device = this.devices.get(sid);
            device.update(data);
            device.updateNameInfo(nameInfo);
        } else {
            const device = new Device(data);
            this.devices.set(sid, device);
            device.updateNameInfo(nameInfo);
        }
    }

    remove(sid) {
        this.devices.delete(sid);
    }

    updateBySid(sid, data) {
        const device = this.devices.get(sid);
        if (device) {
            device.update(data);
        }
    }

    getBySid(sid) {
        return this.devices.get(sid);
    }

    /**
     * 根据网关设备ID，查找子设备列表
     * */
    getDevicesByGatewaySid(gatewaySid) {
        const { deviceMapsHelper } = this.platform;
        const deviceList = [];
        for (const sid of deviceMapsHelper.getDeviceSids(gatewaySid) || []) {
            const device = this.devices.get(sid);
            if (device) {
                deviceList.push(device);
            }
        }
        return deviceList;
    }

    /**
     * 根据网关设备ID及子设备型号，查找子设备列表
     * @param {String} gatewaySid
     * @param {String} model
     * */
    getDevicesByGatewaySidAndModel(gatewaySid, model) {
        return this.getDevicesByGatewaySid(gatewaySid).filter(
            (device) => device.model === model
        );
    }

    /**
     * 根据子设备型号获取子设备列表
     * */
    getDevicesByModel(model) {
        return Array.from(this.devices.values()).filter(
            (device) => device.model === model
        );
    }

    getDeviceList() {
        return Array.from(this.devices.values());
    }

    getAll() {
        return this.devices;
    }

    /**
     * 读设备
     *
     * @param {String} sid 子设备ID
     * */
    read(sid) {
        this.platform.logger.trace(`[DeviceHelper:read] sid: ${sid}`);
        const deviceMapsHelper = this.platform.deviceMapsHelper;
        const gatewaySid = deviceMapsHelper.getGatewaySidByDeviceSid(sid);
        if (!gatewaySid) {
            this.platform.logger.error(
                `[DeviceHelper:read] gateway of device sid: ${sid} not found`
            );
            return;
        }

        const gatewayHelper = this.platform.gatewayHelper;
        const gateway = gatewayHelper.getBySid(gatewaySid);
        if (!gateway) {
            this.platform.logger.error(
                `[DeviceHelper:read] gateway sid: ${gatewaySid} does not exist`
            );
            return;
        }

        this.platform.send(gateway.ip, gateway.port, {
            cmd: 'read',
            sid: sid,
        });
    }

    /**
     * 批量读取
     * */
    readAll(sidList) {
        this.platform.logger.trace(
            `[DeviceHelper:readAll] sidList: ${sidList}`
        );
        if (!sidList) {
            return;
        }
        for (const sid of sidList) {
            this.read(sid);
        }
    }

    /**
     * 写设备
     *
     * @param {String} sid 子设备ID
     * */
    write(sid) {
        this.platform.logger.trace(`[DeviceHelper:write] sid: ${sid}`);
        const device = this.getBySid(sid);
        if (!device) {
            this.platform.logger.error(
                `[DeviceHelper:write] device sid: ${sid} not found`
            );
            return;
        }

        const deviceMapsHelper = this.platform.deviceMapsHelper;
        const gatewaySid = deviceMapsHelper.getGatewaySidByDeviceSid(sid);
        if (!gatewaySid) {
            this.platform.logger.error(
                `[DeviceHelper:write] gateway of device sid: ${sid} not found`
            );
            return;
        }

        const gatewayHelper = this.platform.gatewayHelper;
        const gateway = gatewayHelper.getBySid(gatewaySid);
        if (!gateway) {
            this.platform.logger.error(
                `[DeviceHelper:read] gateway sid: ${gatewaySid} does not exist`
            );
            return;
        }

        const msg = {
            cmd: 'write',
            model: device.model,
            sid: device.sid,
            short_id: device.short_id,
            data: Object.assign({}, device.data),
        };
        // 加密串
        msg.data.key = utils.cipher(
            gateway.token,
            gateway.password,
            gateway.iv
        );
        this.platform.send(gateway.ip, gateway.port, msg);
    }

    /**
     * 改变子设备状态
     * */
    change(options) {
        const { sid, gatewaySid, model, data } = options;
        this.platform.logger.trace(`[DeviceHelper:change] sid: ${sid}`);
        if (!data || !utils.isObject(data)) {
            this.platform.logger.error(
                `[DeviceHelper:change] Bad parameters: ${inspect(options)}`
            );
            return;
        }

        if (sid) {
            // 改变指定设备状态
            const device = this.getBySid(sid);
            if (!device) {
                this.platform.logger.error(
                    `[DeviceHelper:change] device sid: ${sid} not found`
                );
                return;
            }
            device.data = data;
            this.write(sid);
            return;
        }

        if (gatewaySid && model) {
            const devices = this.getDevicesByGatewaySidAndModel(
                gatewaySid,
                model
            );
            for (const device of devices) {
                device.data = data;
                this.write(device.sid);
            }
            return;
        }

        if (model) {
            const devices = this.getDevicesByModel(model);
            for (const device of devices) {
                device.data = data;
                this.write(device.sid);
            }
        }

        this.platform.logger.error(
            `[DeviceHelper:change] Bad parameters: ${inspect(options)}`
        );
    }
}

module.exports = DeviceHelper;
