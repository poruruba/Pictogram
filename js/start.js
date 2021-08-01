'use strict';

//const vConsole = new VConsole();
//window.datgui = new dat.GUI();

const view_width = 1280;
const view_height = 720;
const PICTO_BACKGROUND = '#ffffff';
const PICTO_FOREGROUND = '#000080';

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    data: {
        snapshots: [],
        view_width: view_width,
        view_height: view_height,
    },
    computed: {
    },
    methods: {
        snap_shot: function(){
            var data = canvasElement.toDataURL('image/jpeg', 0.85);
            this.snapshots.push(data);
            var index = this.snapshots.length;
            siiimpleToast.success( "<p>" + index + "</p><img src='" + data + "' width='320px' height='180px'><img>", { position: 'bottom|right' });
        },
        snap_save: function(data){
            var a = document.createElement('a');
            a.href = data;
            a.download = 'snapshot.jpg';
            a.click();
            window.URL.revokeObjectURL(a.href);
        },
    },
    created: function(){
    },
    mounted: function(){
        proc_load();

    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );

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
    canvasCtx.arc(pos.x * canvasElement.width, pos.y * canvasElement.height, r, 0, 2 * Math.PI);
    canvasCtx.fill();
}

function drawParts(pos1, pos2, r1, r2){
    var x1 = pos1.x * canvasElement.width;
    var y1 = pos1.y * canvasElement.height;
    var x2 = pos2.x * canvasElement.width;
    var y2 = pos2.y * canvasElement.height;

    var p = calcRange(x1, y1, x2, y2, r1, r2);

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

function onResults(results)
{
//    videoCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (!results.poseLandmarks || results.poseLandmarks.length < 31 )
        return;

    // 全体を背景色で塗りつぶし
    canvasCtx.fillStyle = PICTO_BACKGROUND;
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.fillStyle = PICTO_FOREGROUND;

    // 頭部分の円を描画
//    var head = dimension([results.poseLandmarks[0], results.poseLandmarks[4], results.poseLandmarks[1]]) * 100;
    var head = dimension([results.poseLandmarks[11], results.poseLandmarks[12], results.poseLandmarks[23], results.poseLandmarks[24]]) * 10;
    drawCircle(median([results.poseLandmarks[0], results.poseLandmarks[4], results.poseLandmarks[1]]), head * 35);

    // 腕の部分を描画
    drawParts(results.poseLandmarks[11], results.poseLandmarks[13], head * 23, head * 20);
    drawParts(results.poseLandmarks[13], results.poseLandmarks[15], head * 20, head * 15);
    drawParts(results.poseLandmarks[12], results.poseLandmarks[14], head * 23, head * 20);
    drawParts(results.poseLandmarks[14], results.poseLandmarks[16], head * 20, head * 15);

    // 足の部分を描画
    var waist = median([results.poseLandmarks[23], results.poseLandmarks[24]]);
    drawParts(waist, results.poseLandmarks[26], head * 23, head * 20);
    drawParts(results.poseLandmarks[26], median([results.poseLandmarks[28], results.poseLandmarks[30], results.poseLandmarks[32]]), head * 20, head * 15);
    drawParts(waist, results.poseLandmarks[25], head * 23, head * 20);
    drawParts(results.poseLandmarks[25], median([results.poseLandmarks[27], results.poseLandmarks[29], results.poseLandmarks[31]]), head * 20, head * 15);
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

