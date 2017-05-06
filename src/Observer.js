import Emitter from './Emitter'
import Socket from 'socket.io-client'

export default class{

    constructor(connection, store) {

        if(typeof connection == 'string'){
            this.Socket = Socket(connection);
        }else{
            this.Socket = connection
        }

        if(store) this.store = store;

        this.onEvent()

    }

    onEvent(){
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


    commitStore(type, payload){

        if(type.split('_')[0].toUpperCase() === 'SOCKET'){

            if(this.store._mutations[type])
                this.store.commit(type, payload)

        }

    }

}
