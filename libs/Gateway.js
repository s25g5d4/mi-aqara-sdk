/**
 * 网关类
 * */
class Gateway {
    /**
     * 实例实始化必须传 sid
     * */
    constructor({ sid, ip, port, token, password, iv }) {
        if (!sid) {
            throw new Error('Bad parameters');
        }

        this.sid = sid;
        this.ip = ip;
        this.port = port;
        this.token = token;
        this.password = password;
        this.iv = iv;
    }

    /**
     * 快速更新当前对象属性
     * */
    update(data) {
        for (const key of Object.keys(data)) {
            if (this.hasOwnProperty(key)) {
                // 只能更新已经定义的属性
                this[key] = data[key];
            }
        }
    }
}

module.exports = Gateway;
