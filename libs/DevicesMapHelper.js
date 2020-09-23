class DevicesGatewayMap {
    constructor() {
        this.map = new Map();
        this.reverseMap = new Map();
    }

    add(gatewaySid, deviceSid) {
        let devices = this.map.get(gatewaySid);
        if (!devices) {
            devices = new Set([deviceSid]);
            this.map.set(gatewaySid, devices);
        } else {
            devices.add(deviceSid);
        }
        let gw = this.reverseMap.get(deviceSid);
        if (gw !== gatewaySid) {
            this.reverseMap.set(deviceSid, gatewaySid);
        }
    }

    deleteGateway(gatewaySid) {
        const devices = this.map.get(gatewaySid);
        if (!devices) {
            return;
        }
        devices.forEach(sid => this.reverseMap.delete(sid));
        this.map.delete(gatewaySid);
    }

    deleteDevice(deviceSid) {
        const gw = this.reverseMap.get(deviceSid);
        if (!gw) {
            return;
        }
        this.reverseMap.delete(deviceSid);
        const devices = this.map.get(gw);
        if (!devices) {
            return;
        }
        devices.delete(deviceSid);
        if (devices.size === 0) {
            this.map.delete(gw);
        }
    }

    getDevices(gatewaySid) {
        const devices = this.map.get(gatewaySid);
        if (!devices) {
            return null;
        }
        return Array.from(devices.keys());
    }

    getGateway(deviceSid) {
        const gw = this.reverseMap.get(deviceSid);
        if (!gw) {
            return null;
        }
        return gw;
    }

    getGatewayMap() {
        return this.map;
    }

    getDevicesMap() {
        return this.reverseMap;
    }
}

/**
 * 网关与子设备映射管理
 */
class DevicesMapHelper {
    constructor() {
        this.deviceMap = new DevicesGatewayMap(); // 网关与子设备的映射，gatewaySid->[sid,sid2...]
    }

    addOrUpdate(gatewaySid, deviceSids) {
        deviceSids.forEach(sid => this.deviceMap.add(gatewaySid, sid));
    }

    remove(gatewaySid) {
        this.deviceMap.deleteGateway(gatewaySid);
    }

    /**
     * 根据网关ID查找设备ID列表
     * @return {Array}
     * */
    getDeviceSids(gatewaySid) {
        return this.deviceMap.getDevices(gatewaySid);
    }

    /**
     * 根据设备ID查找所属网关ID
     * */
    getGatewaySidByDeviceSid(deviceSid) {
        return this.deviceMap.getGateway(deviceSid);
    }

    getAll() {
        return this.deviceMap.getGatewayMap();
    }
}

module.exports = DevicesMapHelper;
