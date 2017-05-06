import Emitter from './Emitter'
import Socket from 'socket.io-client'

export default class {

    constructor(connection, store) {

        if (typeof connection == 'string') {
            this.Socket = Socket(connection);
        } else {
            this.Socket = connection
        }

        if (store) this.store = store;

        this.onEvent()

    }

    onEvent() {
        this.Socket.onevent = (packet) => {
            Emitter.emit(packet.data[0], packet.data[1]);

            if (this.store) this.passToStore('SOCKET_' + packet.data[0], packet.data[1])
        };

        let _this = this;
        let nativeEvents = ["connect", "error", "disconnect", "reconnect", "reconnect_attempt", "reconnecting", "reconnect_error", "reconnect_failed", "connect_error", "connect_timeout", "connecting", "ping", "pong"]

        nativeEvents.forEach((value) => {
            _this.Socket.on(value, (data) => {
                Emitter.emit(value, data);
                if (_this.store) _this.passToStore('SOCKET_' + value, data)
            })
        })

        for (let event in this.Socket._callbacks) {
            this.Socket._callbacks[event].forEach(fn => {
                if (!nativeEvents.includes(event)) {
                    Emitter.addListener(event, fn);
                }
            })
        }

        this.Socket.on = function (event, fn) {
            Emitter.addListener(event, fn);
        }
        this.Socket.off = function (event, fn) {
            Emitter.removeListener(event, fn);
        }
    }


    passToStore(event, payload) {
        if (!event.startsWith('SOCKET_')) return
        for (let namespaced in this.store._mutations) {
            let mutation = namespaced.split('/').pop()
            mutation = mutation.replace('SOCKET_', '').replace(/_/, '');
            if (`SOCKET_${mutation.toUpperCase()}` === event.toUpperCase()) this.store.commit(namespaced, payload);
        }

        for (let namespaced in this.store._actions) {

            let action = namespaced.split('/').pop();
            if (!action.startsWith('socket_')) continue

            let camelcased = 'socket_' + event
                    .replace('SOCKET_', '')
                    .replace(/^([A-Z])|[\W\s_]+(\w)/g, (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase())

            if (action === camelcased) this.store.dispatch(namespaced, payload)
        }
    }
}
