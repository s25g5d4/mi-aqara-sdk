/**
 * 网关与子设备映射管理
 */
class DeviceMapsHelper {
    constructor() {
        this.deviceMaps = new Map(); // 网关与子设备的映射，gatewaySid->[sid,sid2...]
    }

    addOrUpdate(gatewaySid, deviceSids) {
        this.deviceMaps.set(gatewaySid, deviceSids);
    }

    remove(gatewaySid) {
        this.deviceMaps.delete(gatewaySid);
    }

    /**
     * 根据网关ID查找设备ID列表
     * @return {Array}
     * */
    getDeviceSids(gatewaySid) {
        return this.deviceMaps.get(gatewaySid);
    }

    /**
     * 根据设备ID查找所属网关ID
     * */
    getGatewaySidByDeviceSid(deviceSid) {
        for (const [gateway, devices] of this.deviceMaps) {
            if (devices.some((id) => id === deviceSid)) {
                return gateway;
            }
        }
        return null;
    }

    getAll() {
        return this.deviceMaps;
    }
}

module.exports = DeviceMapsHelper;
