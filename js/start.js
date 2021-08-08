'use strict';

//const vConsole = new VConsole();
//window.datgui = new dat.GUI();

const view_width = 1280;
const view_height = 720;
const PICTO_BACKGROUND = '#ffffff';
const PICTO_FOREGROUND = '#000080';
const PICTO_LINEWIDTH = 5;

var g_recorder = null;
var equip_index = 0;
var tool_index = 0;
const NUM_OF_EQUIP = 3;
const NUM_OF_TOOL = 4;

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    data: {
        snapshots: [],
        view_width: view_width,
        view_height: view_height,
        record_fps: 30,
        recording: false,
    },
    computed: {
    },
    methods: {
        snap_shot: function(){
            var data = canvasElement.toDataURL('image/jpeg', 0.85);
            this.snapshots.push({ type: 'image/jpeg', data: data } );
            var index = this.snapshots.length;
            siiimpleToast.success( "<p>" + index + " 静止画</p><img src='" + data + "' width='320px' height='180px'><img>", { position: 'bottom|right' });
        },
        snap_save: function(item){
            var a = document.createElement('a');
            a.href = item.data;
            if( item.type.startsWith('image') )
                a.download = 'snapshot.jpg';
            else if( item.type.startsWith('video') )
                a.download = 'snapshot.webm';
            a.click();
            window.URL.revokeObjectURL(a.href);
        },
        record_start: function(){
            if (g_recorder) {
                g_recorder.stop();
                g_recorder = null;
            }
            this.recording = true;
            var stream = canvasElement.captureStream(this.record_fps);
            this.record_chunks = [];
            g_recorder = new MediaRecorder(stream);
            g_recorder.ondataavailable = this.record_onavailable;
            g_recorder.onstop = this.record_onstop;
            this.image = canvasElement.toDataURL('image/jpeg', 0.85);
            g_recorder.start();
        },
        record_stop: function () {
//            console.log('stop');
            g_recorder.stop();
        },
        record_onavailable: function (e) {
//            console.log('ondataavailable');
            this.record_chunks.push(e.data);
        },
        record_onstop: function () {
            if (!this.recording)
                return;

//            console.log('onstop');
            var blob = new Blob(this.record_chunks, { type: g_recorder.mimeType });
            this.snapshots.push({ type: g_recorder.mimeType, data: URL.createObjectURL(blob), image: this.image } );
            this.chunks = [];
            g_recorder = null;
            this.recording = false;
            var index = this.snapshots.length;
            siiimpleToast.success("<p>" + index + " 動画</p><img src='" + this.image + "' width='320px' height='180px'><img>", { position: 'bottom|right' });
            this.image = null;
        },
    },
    created: function(){
    },
    mounted: function(){
        proc_load();

        document.onkeydown = change_mode;
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );

function change_mode(e) {
    if (e.key == "ArrowRight") {
        equip_index++;
        if (equip_index > NUM_OF_EQUIP)
            equip_index = 0;
    }else
    if (e.key == "ArrowLeft") {
        tool_index++;
        if (tool_index > NUM_OF_TOOL)
            tool_index = 0;
    }else
    if (e.key == "ArrowUp") {
        window.vue.snap_shot();
    }
}

const canvasElement = document.querySelector('#output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const videoElement = document.querySelector('#input_video');

const pose = new Pose({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    }
});
pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    selfieMode: true,
});
pose.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await pose.send({ image: videoElement });
    },
    width: view_width,
    height: view_height
});
camera.start();

function drawCircle(pos, r){
    canvasCtx.beginPath();
    canvasCtx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
    canvasCtx.fill();
}

function drawEllipse(pos, rx, ry, rad){
    canvasCtx.beginPath();
    canvasCtx.ellipse(pos.x, pos.y, rx, ry, rad, 0, 2 * Math.PI);
    canvasCtx.fill();
}

function strokeEllipse(pos, rx, ry, rad) {
    canvasCtx.beginPath();
    canvasCtx.ellipse(pos.x, pos.y, rx, ry, rad, 0, 2 * Math.PI);
    canvasCtx.stroke();
}

function drawPole( pos1, pos2, r){
    var p = calcRange(pos1.x, pos1.y, pos2.x, pos2.y, r, r);

    canvasCtx.beginPath();
    canvasCtx.lineTo(p.q3x, p.q3y);
    canvasCtx.lineTo(p.q4x, p.q4y);
    canvasCtx.lineTo(p.q6x, p.q6y);
    canvasCtx.lineTo(p.q5x, p.q5y);
    canvasCtx.fill();

    canvasCtx.beginPath();
    canvasCtx.arc(p.q1x, p.q1y, r, 0, 2 * Math.PI);
    canvasCtx.fill();
    canvasCtx.beginPath();
    canvasCtx.arc(p.q2x, p.q2y, r, 0, 2 * Math.PI);
    canvasCtx.fill();
}

function drawParts(pos1, pos2, r1, r2){
    var p = calcRange(pos1.x, pos1.y, pos2.x, pos2.y, r1, r2);

    canvasCtx.beginPath();
    canvasCtx.moveTo(p.q1x, p.q1y);
    canvasCtx.lineTo(p.q3x, p.q3y);
    canvasCtx.lineTo(p.q4x, p.q4y);
    canvasCtx.lineTo(p.q2x, p.q2y);
    canvasCtx.lineTo(p.q6x, p.q6y);
    canvasCtx.lineTo(p.q5x, p.q5y);
    canvasCtx.fill();

    canvasCtx.beginPath();
    canvasCtx.arc(p.q1x, p.q1y, r1, 0, 2 * Math.PI);
    canvasCtx.fill();
    canvasCtx.beginPath();
    canvasCtx.arc(p.q2x, p.q2y, r2, 0, 2 * Math.PI);
    canvasCtx.fill();
}

function median(array){
    var sum_x = 0;
    var sum_y = 0;
    for( var i = 0 ; i < array.length ; i++ ){
        sum_x += array[i].x;
        sum_y += array[i].y;
    }

    return { x: sum_x / array.length, y : sum_y / array.length };
}

function dimension(array){
    var sum = 0;
    for (var i = 1; i < array.length; i++) {
        sum += Math.sqrt(Math.pow(array[i - 1].x - array[i].x, 2) + Math.pow(array[i - 1].y - array[i].y, 2) );
    }

    return sum / array.length;
}

function distance( pos1, pos2 ){
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
}

function convertPosition(landmarks){
    var pos = [];
    for( var i = 0 ; i <= 32 ; i++ ){
        pos[i] = { x: landmarks[i].x * canvasElement.width, y: landmarks[i].y * canvasElement.height };
    }

    return pos;
}

function onResults(results)
{
//    videoCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (!results.poseLandmarks || results.poseLandmarks.length < 33 )
        return;

    // 全体を背景色で塗りつぶし
    canvasCtx.fillStyle = PICTO_BACKGROUND;
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.fillStyle = PICTO_FOREGROUND;
    canvasCtx.strokeStyle = PICTO_FOREGROUND;
    canvasCtx.lineWidth = PICTO_LINEWIDTH;

    var positions = convertPosition(results.poseLandmarks);

    // 頭部分の円を描画
//    var base = dimension([positions[0], positions[4], positions[1]]) * 100;
    var base = dimension([positions[11], positions[12], positions[23], positions[24]]) / 1000;
    drawCircle(median([positions[0], positions[4], positions[1]]), base * 300);

    // 腕の部分を描画
    drawParts(positions[11], positions[13], base * 180, base * 150);
    drawParts(positions[13], positions[15], base * 150, base * 120);
    drawParts(positions[12], positions[14], base * 180, base * 150);
    drawParts(positions[14], positions[16], base * 150, base * 120);

    // 足の部分を描画
    var waist = median([positions[23], positions[24]]);
    drawParts(waist, positions[26], base * 210, base * 180);
    drawParts(positions[26], median([positions[28], positions[30], positions[32]]), base * 170, base * 130);
    drawParts(waist, positions[25], base * 210, base * 180);
    drawParts(positions[25], median([positions[27], positions[29], positions[31]]), base * 170, base * 130);

    // 道具を描画
    showTool(tool_index, positions, base);

    // 設備を描画
    showEquip(equip_index);
}

function showEquip(mode){
    switch(mode){
        case 1:{
            var r = 20;
            var pos = { x: 0.2 * canvasElement.width, y: 0.2 * canvasElement.height };
            strokeEllipse(pos, r * 4, r, 0);
            break;
        }
        case 2: {
            var r = 40;
            var pos = { x: 0.8 * canvasElement.width, y: 0.8 * canvasElement.height };
            drawCircle(pos, r);
            break;
        }
        case 3: {
            var r = 40;
            var pos = { x: 0.8 * canvasElement.width, y: 0.2 * canvasElement.height };
            drawCircle(pos, r);
            break;
        }
    }
}

function showTool(mode, positions, multi){
    switch(mode){
        case 1:{
            var r = 250 * multi;
            var d = distance(positions[21], positions[15]);
            var norm = { x: (positions[21].x - positions[15].x) / d, y: (positions[21].y - positions[15].y) / d };
            var end = { x: positions[15].x + r * norm.x, y: positions[15].y + r * norm.y };
            drawCircle(end, r);
            break;
        }
        case 2:{
            var r = 250 * multi;
            drawCircle(positions[15], r);
            drawCircle(positions[16], r);
            break;
        }
        case 3:{
            var r = multi * 50;
            var len = 2000 * multi;
            var d = distance(positions[19], positions[15]);
            var start = positions[19];
            var end = { x: positions[19].x + len * (positions[19].x - positions[15].x) / d, y: positions[19].y + len * (positions[19].y - positions[15].y) / d };
            drawPole(start, end, r, r);
            break;
        }
        case 4:{
            var r = 250 * multi;
            var center = median([positions[17], positions[19]]);
            var d = distance(center, positions[15]);
            var end = { x: positions[15].x + r * 1.2 * (center.x - positions[15].x) / d, y: positions[15].y + r * (center.y - positions[15].y) / d };
            drawEllipse(end, r * 1.2, r, Math.atan2(center.y - positions[15].y, center.x - positions[15].x));
            break;
        }
    }
}

function calcRange( x1, y1, x2, y2, r1, r2 ){
    var D = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    var cosF = (x2 - x1) / D;
    var sinF = (y2 - y1) / D;

    var p3x = r1 * (r1 - r2) / D;
    var p3y = r1 * Math.sqrt(1 - Math.pow((r1 - r2) / D, 2));
    var q3 = rotation(p3x, p3y, cosF, sinF);
    var q3x = q3.x + x1;
    var q3y = q3.y + y1;

    var p2x = D;
    var p2y = 0;
    var q2 = rotation( p2x, p2y, cosF, sinF );
    var q2x = q2.x + x1;
    var q2y = q2.y + y1;

    var p4x = D + r2 / r1 * p3x;
    var p4y = r2 / r1 * p3y;
    var q4 = rotation(p4x, p4y, cosF, sinF );
    var q4x = q4.x + x1;
    var q4y = q4.y + y1;

    var p5x = p3x;
    var p5y = -p3y;
    var q5 = rotation(p5x, p5y, cosF, sinF);
    var q5x = q5.x + x1;
    var q5y = q5.y + y1;

    var p6x = p4x;
    var p6y = -p4y;
    var q6 = rotation(p6x, p6y, cosF, sinF);
    var q6x = q6.x + x1;
    var q6y = q6.y + y1;

    var q1x = x1;
    var q1y = y1;

    return { q1x, q1y, q2x, q2y, q3x, q3y, q4x, q4y, q5x, q5y, q6x, q6y };
}

function rotation(x, y, cosF, sinF) {
    return { x: x * cosF - y * sinF, y: x * sinF + y * cosF };
}

