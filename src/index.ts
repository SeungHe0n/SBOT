import { config } from './config';

import Server from './models/Server';
import { help } from './models/Info';
import { Client, Intents } from 'discord.js';
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const serverList = new Map <string, Server>();

client.on('ready', () => {
    console.log(`bot ${client.user.tag} is Ready !`);
});

client.on('channelDelete', channel => {
    if (channel.type !== 'DM'){
        const server = serverList.get(channel.guildId);
        if (channel.id === server.getSummarychannelid()) {
            server.clearSummary();
        }
    }
})

client.on('messageCreate', message => {
    if (message.author.bot) return;

    const server = serverList.get(message.guildId);
    const userId = message.author.id;
    const short = server.getShortlist();

    const content = message.content.toLowerCase();
    const args = content.split(' ');
    const command = args.shift();

    if (args.length > 3) return;

    if (command === 'set') {
        const target = args.shift();

        if (args.length === 1 && target === 'goalhour' ) {
            const hour = parseInt(args.at(0));
            if (server.setGoalhour(hour)) {
                message.channel.send(`목표 공부시간이 **${hour}시간**으로 변경되었습니다.`);
            } else {
                message.channel.send(`목표 공부시간을 자연수로 입력해주세요.`);
            }

        }

        if (args.length === 2 && target === 'summarytime') {
            const hour = parseInt(args.at(0));
            const min = parseInt(args.at(1));

            if (server.resetSummary(hour, min)) {
                message.channel.send(`**하루 정리**가 ${hour}시 ${min}분을 기준으로 동작합니다.`);
            } else {
                message.channel.send(`0시 0분부터 23시 59분 사이로 설정해주세요.`);
            }
        }

        if (args.length === 0 && target === 'summary') {
            const summary = server.setSummary(message.channel);
            if (summary === -1) {
                message.channel.send(`**하루 정리**가 설정된 다른 채널이 있습니다.`);
            } else if (summary === 0) {
                message.channel.send(`이미 **하루 정리**가 설정된 채널입니다.`);
            } else {
                let comment = `해당 채널에 **하루 정리**가 설정되었습니다.\n`;
                comment += `목표 시간을 달성하면 따봉:thumbsup:을 , 달성하지 못한다면 벽돌:bricks:을 받습니다.`
                message.channel.send(comment);
            }
        }

        if (args.length === 0 && target === 'korean') {
            if (short.setKorean()) {
                message.channel.send(`지금부터 한글 명령어 \`ㄴ\` , \`ㅔ\` , \`ㅗ\` , \`ㅎ\` 가 적용됩니다.\n`);
            } else {
                message.channel.send(`이미 한글 명령어가 적용된 상태입니다.`);
            }
        }
    }

    if (command === 'clear') {
        if (args.length !== 1) return;
        const target = args.shift();

        if (target === 'summary') {
            if (server.getSummarychannelid() && message.channelId !== server.getSummarychannelid()) {
                message.channel.send(`**하루 정리**를 설정한 채널에서 해제해주세요.`);
            } else if (server.clearSummary()) {
                message.channel.send(`**하루 정리**가 해제되었습니다.`);
            } else {
                message.channel.send(`**하루 정리**가 설정된 채널이 없습니다.`)
            }
        }

        if (target === 'korean') {
            if (short.clearKorean()) {
                message.channel.send(`지금부터 한글 명령어가 해제됩니다.`);
            } else {
                message.channel.send(`이미 한글 명령어가 해제된 상태입니다.`);
            }
        }
    }

    if (content === 'init') {
        const channelManager = message.guild.channels;
        channelManager.create('공부-채널', { type: 'GUILD_CATEGORY'})
        .then((category) => {
            channelManager.create('출석-체크', { type: 'GUILD_TEXT', parent: category.id, topic: '나 공부하러 왔다 ~ :wave:'});
            channelManager.create('시간-체크', { type: 'GUILD_TEXT', parent: category.id, topic: 'SBOT으로 공부시간 체크하자! :alarm_clock:'})
            .then((channel) => {
               channel.send(help);
            });
            channelManager.create('하루-정리', { type: 'GUILD_TEXT', parent: category.id, topic: '오늘 따봉:thumbsup:을 받을까, 벽돌:bricks:을 받을까?'})
            .then((channel) => {
                server.setSummary(channel);
                let comment = `해당 채널에 **하루 정리**가 설정되었습니다.\n`;
                comment += `목표 시간을 달성하면 따봉:thumbsup:을 , 달성하지 못한다면 벽돌:bricks:을 받습니다.`
                channel.send(comment);
            })
            channelManager.create('캠-스터디', { type: 'GUILD_VOICE', parent: category.id});
        });
        
        channelManager.create('SBOT', { type: 'GUILD_CATEGORY'})
        .then((category) => {
            channelManager.create('봇-안내', { type: 'GUILD_TEXT', parent: category.id});
            channelManager.create('봇-관리', { type: 'GUILD_TEXT', parent: category.id});
        });
    }

    if (content === 'help') {
        message.channel.send(help);
    }

    if (short.getShort('start').includes(content)) {
        if (server.addUser(userId)) {
            message.channel.send(`<@${userId}> 새로운 스터디원을 환영합니다!  :partying_face:`);
        }

        const user = server.getUser(userId);
        if (user.startStopwatch()) {
            message.channel.send(`<@${userId}> 스톱워치 시작`);
        }
    }

    if (short.getShort('pause').includes(content)) {
        const user = server.getUser(userId);
        if (user && user.pauseStopwatch()) {
            message.channel.send(`<@${userId}> 스톱워치 멈춤`);
        }
    }
   
    if (short.getShort('hours').includes(content)) {
        const user = server.getUser(userId);
        if (!user) {
            message.channel.send(`<@${userId}> 스톱워치를 먼저 시작해주세요.`);
            return;
        }

        const totalTime = user.getTotaltime();
        let comment = `<@${userId}> 오늘 하루  **${totalTime.getHours()}시간 ${totalTime.getMinutes()}분** `;
        if (user.getStarttime()) {
            comment += `공부중  :book:`;
        } else {
            comment += `공부  :blue_book:`;
        }
        message.channel.send(comment);
    }

    if (short.getShort('goal').includes(content)) {
        message.channel.send(`목표 공부시간은 **${server.getGoalhour()}시간**입니다.`);
    }

    if (content === 'console server') {
        console.log(server);
    }

});

client.login(config.token)
    .then(() => {
        console.log('client login !');
        client.guilds.cache.forEach(guild => {
            const server = new Server(guild.id);
            serverList.set(guild.id, server);
        });
    })