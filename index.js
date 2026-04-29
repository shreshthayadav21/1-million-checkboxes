import http from 'node:http';
import path from 'node:path';

import express from 'express';
import {Server, Socket} from 'socket.io';

import {publisher,subscriber,redis} from './redis-connection.js'

const CHECKBOX_COUNT = 100;
const CHECKBOX_STATE_KEY = 'checkbox-state:v1';

const rateLimitingHashMap = new Map();

// const state = {
//     checkboxes: new Array(CHECKBOX_COUNT).fill(null),
// }


async function main() {

    const PORT = process.env.PORT??8000;

    const app = express();//now express is the handler function
    const server = http.createServer(app);

    const io = new Server();
    io.attach(server);

    await subscriber.subscribe("internal-server:checkbox:change");
    subscriber.on('message',(channel,message) => {
        if(channel === 'internal-server:checkbox:change') {
            const {index,checked} = JSON.parse(message);
            io.emit('server:checkbox:change',{index,checked});
            // state.checkboxes[index] = checked;            
        }
    })

    //Socket io handlers


    io.on('connection',(socket) => {
        console.log(`Socket connected`, {id:socket.id});

        socket.on('client:checkbox:change',async (data) => {
            console.log(`[Socket:${socket.id}]:client:checkbox:change`,data);

            //Rate limiting
            const lastOperationTime = rateLimitingHashMap.get(socket.id);
            if(lastOperationTime) {
                
                const timeElapsed = Date.now() - lastOperationTime;
                console.log('timeElapsed', timeElapsed);
                if(timeElapsed < 5.5 * 1000) {
                    console.log('RATE LIMITED');
                    socket.emit('server:error',{error:'Please wait'});
                    return;
                } 
            }
            rateLimitingHashMap.set(socket.id,Date.now());
            const existingState = await redis.get(CHECKBOX_STATE_KEY);

            const remoteData = existingState
            ? JSON.parse(existingState)
            : new Array(CHECKBOX_COUNT).fill(false);

            remoteData[data.index] = data.checked;
            await redis.set(CHECKBOX_STATE_KEY, JSON.stringify(remoteData));
            // if(existingState) {
            //     const remoteData = JSON.parse(existingState);
            //     remoteData[data.index] = data.checked;
            //     await redis.set(CHECKBOX_STATE_KEY,JSON.stringify(remoteData))
            // } else {
            //     await redis.set(
            //         CHECKBOX_STATE_KEY,
            //         JSON.stringify(new Array(CHECKBOX_COUNT).fill(null)),
            //     )
            // }
            // io.emit('server:checkbox:change',data);
            // state.checkboxes[data.index] = data.checked;

            await publisher.publish('internal-server:checkbox:change',JSON.stringify(data));
        })
    })



    //Express handlers

    app.use(express.static(path.resolve('./public')));
    app.get('/health',(req,res)=>res.json({healthy:true}));    
    app.get('/checkboxes',async (req,res) => {

        const existingState = await redis.get(CHECKBOX_STATE_KEY);        

        if(existingState) {
            return res.json({checkboxes:JSON.parse(existingState)});
        }
        return res.json({checkboxes:new Array(CHECKBOX_COUNT).fill(false)});
        // return res.json({checkboxes:state.checkboxes});
    });

    server.listen(PORT,() => {
        console.log(`Server is listening on port http://localhost:${PORT}`);
    }); 
}
main();