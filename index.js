const MiAqara = require('./libs/MiAqara');
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

    getGatewayBySid(sid) {
        return this._miAqara.gatewayHelper.getBySid(sid);
    }

    getGatewayList() {
        return this._miAqara.gatewayHelper.getGatewayList();
    }

    controlLight(params) {
        return this._miAqara.gatewayHelper.controlLight(params);
    }

    getDeviceBySid(sid) {
        return this._miAqara.deviceHelper.getBySid(sid);
    }

    getDevicesByGatewaySid(sid) {
        return this._miAqara.deviceHelper.getDevicesByGatewaySid(sid);
    }

    getDevicesByGatewaySidAndModel(gatewaySid, model) {
        return this._miAqara.deviceHelper.getDevicesByGatewaySidAndModel(
            gatewaySid,
            model
        );
    }

    getDevicesByModel(model) {
        return this._miAqara.deviceHelper.getDevicesByModel(model);
    }

    getDeviceList() {
        return this._miAqara.deviceHelper.getDeviceList();
    }

    change(params) {
        return this._miAqara.deviceHelper.change(params);
    }
}

module.exports = {
    MiAqaraSDK,
    create(gateways, opts) {
        return new MiAqaraSDK(gateways, opts);
    },
};
