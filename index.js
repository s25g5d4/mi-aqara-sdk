const MiAqara = require('./libs/MiAqara');
const Gateway = require('./libs/Gateway');
const Device = require('./libs/Device');
const { EventEmitter } = require('events');

class MiAqaraSDK extends EventEmitter {
    constructor(gateways, opts) {
        super();

        this._miAqara = new MiAqara(gateways, opts);
        this._miAqara.on('ready', (...args) => this.emit('ready', ...args));
        this._miAqara.on('message', (...args) => this.emit('message', ...args));
        this._miAqara.on('error', (...args) => this.emit('error', ...args));
        this.started = false;
        this.parser = this._miAqara.parser;
    }

    start() {
        this._miAqara.start();
        this.started = true;
    }

    stop() {
        if (this.started) {
            this._miAqara.stop();
        }
    }

    /**
     *
     * @param {string} sid
     * @returns {Gateway}
     */
    getGatewayBySid(sid) {
        return this._miAqara.gatewayHelper.getBySid(sid);
    }

    /**
     *
     * @param {string} sid
     * @returns {Gateway}
     */
    getGatewayByDeviceSid(sid) {
        const gw = this._miAqara.devicesMapHelper.getGatewaySidByDeviceSid(sid);
        if (!gw) {
            return null;
        }
        return this.getGatewayBySid(gw);
    }

    /**
     *
     * @returns {Array<Gateway>}
     */
    getGatewayList() {
        return this._miAqara.gatewayHelper.getGatewayList();
    }

    controlLight(params) {
        return this._miAqara.gatewayHelper.controlLight(params);
    }

    /**
     *
     * @param {string} sid
     * @returns {Device}
     */
    getDeviceBySid(sid) {
        return this._miAqara.deviceHelper.getBySid(sid);
    }

    /**
     *
     * @param {string} sid
     * @returns {Array<Device>}
     */
    getDevicesByGatewaySid(sid) {
        return this._miAqara.deviceHelper.getDevicesByGatewaySid(sid);
    }

    /**
     *
     * @param {string} gatewaySid
     * @param {string} model
     * @returns {Array<Device>}
     */
    getDevicesByGatewaySidAndModel(gatewaySid, model) {
        return this._miAqara.deviceHelper.getDevicesByGatewaySidAndModel(
            gatewaySid,
            model
        );
    }

    /**
     *
     * @param {string} model
     * @returns {Array<Device>}
     */
    getDevicesByModel(model) {
        return this._miAqara.deviceHelper.getDevicesByModel(model);
    }

    /**
     *
     * @returns {Array<Device>}
     */
    getDeviceList() {
        return this._miAqara.deviceHelper.getDeviceList();
    }

    change(params) {
        return this._miAqara.deviceHelper.change(params);
    }
}

module.exports = {
    MiAqaraSDK,
};
