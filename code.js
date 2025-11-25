var N = 300;//total number of particles 400 or 900
var m_min = Math.pow(3, 2); // minimum mass based on min radius 3
var m_max = Math.pow(15, 2); // maximum mass based on max radius 15
var R = 3;//pollen size in px 30
var M = Math.pow(R, 2);
var IVD;
var molecule = [];
var canvasSize = 448;//in px 600
var dT = 10;

var trajectoryState = false;
var periodicBoundary = false;
var monitorState = false;
var timer;
var collision_x = [];
var collision_y = [];
var collision_count = 0;
var collision_count_current = 0;
var collision_count_limit = 50;

document.getElementById("Number").value = N;
document.getElementById("upperRadius").value = R;

var ctx_myLayer = document.getElementById("myLayer").getContext("2d");
var ctx_myCanvas = document.getElementById("myCanvas").getContext("2d");

function initialize() {
  var v_0 = [];
  molecule = [];
  v_0 = randomNormalDistribution();
  for (var i = 0; i < N + 1; i++) {
    var current_radius;
    var current_mass;
    if (i === 0) { // Pollen particle
      current_radius = R;
      current_mass = M;
    } else { // Other particles
      current_radius = Math.floor(Math.random() * (15 - 3 + 1)) + 3; // Random radius between 3 and 15
      current_mass = Math.pow(current_radius, 2);
    }

    var position_x = Math.random() * canvasSize / Math.sqrt(N) + (i % Math.sqrt(N)) * canvasSize / Math.sqrt(N);
    var position_y = Math.random() * canvasSize / Math.sqrt(N) + Math.floor(i / Math.sqrt(N)) * canvasSize / Math.sqrt(N);
    var distance_to_pollen = Math.sqrt(Math.pow(position_x - canvasSize / 2, 2) + Math.pow(position_y - canvasSize / 2, 2));
    while (distance_to_pollen <= (current_radius + R)) { // Use current_radius
      position_x = Math.random() * canvasSize;
      position_y = Math.random() * canvasSize;
      distance_to_pollen = Math.sqrt(Math.pow(position_x - canvasSize / 2, 2) + Math.pow(position_y - canvasSize / 2, 2));
    }
    var v = randomNormalDistribution();
    molecule[i] = {
      xvalue: position_x,//in px
      yvalue: position_y,//in px
      xvelocity: (IVD) ? (Math.random() * 3.6 - 1.8) : v[0],
      yvelocity: (IVD) ? (Math.random() * 3.6 - 1.8) : v[1],
      xclass: Math.floor(this.xvalue / (canvasSize / 10)),
      yclass: Math.floor(this.yvalue / (canvasSize / 10)),
      radius: current_radius,
      mass: current_mass
    }
  }
}
function randomNormalDistribution() {
  var u = 0.0, v = 0.0, w = 0.0, c = 0.0;
  do {
    u = Math.random() * 2 - 1.0;
    v = Math.random() * 2 - 1.0;//二つの独立した確率変数（-1,1）を得る
    w = u * u + v * v;
  } while (w == 0.0 || w >= 1.0)
  c = Math.sqrt((-2 * Math.log(w)) / w);//Box-Muller変換
  return [u * c, v * c];//2つの標準正規分布に従う乱数を返す。それらを配列に格納して返す。
}

function createCircle(x, y, r_val, cmap, ctx) {
  //var cs=document.getElementById(canvasName);
  //var ctx=cs.getContext("2d");
  ctx.fillStyle = cmap;//"#ADD8E6" for lightblue; "#CD5C5C" for indian red; "#87CEEB" for skyblue
  ctx.beginPath();
  ctx.arc(x, y, r_val, 0, 2 * Math.PI);
  ctx.closePath();     //パスを閉じる
  ctx.fill();
}
function clearCanvas(canvasName) {
  var cs = document.getElementById(canvasName);
  var ctx = cs.getContext("2d");
  ctx.save();
  ctx.fillStyle = "#000000"; // Set fill style to black
  ctx.fillRect(0, 0, cs.width, cs.height); // Fill the entire canvas with black
  ctx.restore();
  ctx.clearRect(0, 0, cs.width, cs.height);
}
function drawParticles() {
  clearCanvas("myCanvas");
  for (var i = 0; i < N + 1; i++) {
    createCircle(molecule[i].xvalue, molecule[i].yvalue, molecule[i].radius, "#00BFFF", ctx_myCanvas);
  }
}
function drawTrajectory() {
  createCircle(molecule[0].xvalue, molecule[0].yvalue, 0.5, "rgba(143,188,143,0.6)", ctx_myLayer);
}

function move() {
  for (var i = 0; i < N + 1; i++) {
    var radius_i = molecule[i].radius;
    var mass_i = molecule[i].mass;

    molecule[i].xvalue += molecule[i].xvelocity;
    molecule[i].yvalue += molecule[i].yvelocity;

    var x1 = molecule[i].xvalue;
    var y1 = molecule[i].yvalue;

    //周期境界条件
    if (periodicBoundary) {
      if (x1 < 0 || x1 > canvasSize) {
        molecule[i].xvalue = (canvasSize + x1) % canvasSize;
      }
      if (y1 < 0 || y1 > canvasSize) {
        molecule[i].yvalue = (canvasSize + y1) % canvasSize;
      }
    }
    //非周期境界条件
    else {
      if (x1 < radius_i || x1 > (canvasSize - radius_i)) {
        molecule[i].xvelocity = (-molecule[i].xvelocity);
        if (x1 < radius_i) molecule[i].xvalue = radius_i;
        else molecule[i].xvalue = canvasSize - radius_i;
      }//衝突境界
      if (y1 < radius_i || y1 > (canvasSize - radius_i)) {
        molecule[i].yvelocity = (-molecule[i].yvelocity);
        if (y1 < radius_i) molecule[i].yvalue = radius_i;
        else molecule[i].yvalue = canvasSize - radius_i;
      }//衝突境界
    }

    molecule[i].xclass = Math.floor(molecule[i].xvalue / (canvasSize / 10));
    molecule[i].yclass = Math.floor(molecule[i].yvalue / (canvasSize / 10));

    if (i != 0) {//液体分子が他の粒子（花粉を含む）と衝突する
      for (var j = 0; j < N + 1 && j != i; j++) {
        var radius_j = molecule[j].radius;
        var mass_j = molecule[j].mass;

        var x1 = molecule[i].xvalue;
        var x2 = molecule[j].xvalue;
        var y1 = molecule[i].yvalue;
        var y2 = molecule[j].yvalue;

        var check1 = false;
        var xclass_2 = molecule[j].xclass;
        var xclass_1 = molecule[i].xclass;
        var yclass_2 = molecule[j].yclass;
        var yclass_1 = molecule[i].yclass;

        //衝突の可能性を考慮する必要があるかどうかを判断する
        if (periodicBoundary) {
          if (Math.abs(xclass_2 - xclass_1) <= 1 && Math.abs(yclass_2 - yclass_1) <= 1) {
            check1 = true;
          }
          else if (j === 0) {
            if (Math.abs(yclass_2 - yclass_1) <= 1 && Math.abs(xclass_1 - xclass_2) === 9) {
              check1 = true;
              x2 += (canvasSize * Math.sign(xclass_1 - xclass_2));
            }
            else if (Math.abs(xclass_2 - xclass_1) <= 1 && Math.abs(yclass_1 - yclass_2) === 9) {
              check1 = true;
              y2 += (canvasSize * Math.sign(yclass_1 - yclass_2));
            }
            else if (Math.abs(xclass_1 - xclass_2) == 9 && Math.abs(yclass_1 - yclass_2) === 9) {
              check1 = true;
              x2 += (canvasSize * Math.sign(xclass_1 - xclass_2));
              y2 += (canvasSize * Math.sign(yclass_1 - yclass_2));
            }
          }
        }
        else {
          check1 = (Math.abs(xclass_2 - xclass_1) <= 1 && Math.abs(yclass_2 - yclass_1) <= 1);
        }

        if (check1) {//衝突の可能性を考慮する必要があるかどうかを判断する
          var distance = Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
          if (distance <= (radius_i + radius_j)) {//衝突の可能性を判断し、ある場合はループに入る
            var totalMass = mass_i + mass_j;
            //relative to central mass
            var v_x_relative_to_c_i = (molecule[i].xvelocity - molecule[j].xvelocity) * mass_j / totalMass;
            var v_y_relative_to_c_i = (molecule[i].yvelocity - molecule[j].yvelocity) * mass_j / totalMass;
            //normalized to unit vector
            var v_relative_to_c_i_magnitude = Math.sqrt(Math.pow(v_x_relative_to_c_i, 2) + Math.pow(v_y_relative_to_c_i, 2));
            var v_x_relative_to_c_i_normalized = v_x_relative_to_c_i / v_relative_to_c_i_magnitude;
            var v_y_relative_to_c_i_normalized = v_y_relative_to_c_i / v_relative_to_c_i_magnitude;
            //central mass
            var v_x_c = (mass_i * molecule[i].xvelocity + mass_j * molecule[j].xvelocity) / totalMass;
            var v_y_c = (mass_i * molecule[i].yvelocity + mass_j * molecule[j].yvelocity) / totalMass;

            //衝突の有無を判断する
            var dotProduct = v_y_relative_to_c_i_normalized * (y2 - y1) + v_x_relative_to_c_i_normalized * (x2 - x1);
            if (dotProduct > 0) {
              if (j === 0) {
                collision_x[collision_count] = (x1 - x2) / distance;
                collision_y[collision_count] = (y1 - y2) / distance;
                collision_count_current = collision_count;
                collision_count = (collision_count + 1) % collision_count_limit;
              }

              var b = (v_x_relative_to_c_i_normalized * (y2 - y1) - v_y_relative_to_c_i_normalized * (x2 - x1));
              var theta = 2 * Math.acos(b / (radius_i + radius_j));//scatter angle from 0 to 2*pi; 反時計回りを正とする

              var alpha;
              if (v_y_relative_to_c_i_normalized >= 0) {
                alpha = Math.acos(v_x_relative_to_c_i_normalized);
              }//from 0 to pi
              else {
                alpha = 2 * Math.PI - Math.acos(v_x_relative_to_c_i_normalized);
              }//from pi to 2*pi
              var alpha_new = alpha - theta;

              //velocity change after scatter
              var v_x_relative_to_c_i_scatter = v_relative_to_c_i_magnitude * Math.cos(alpha_new);
              var v_y_relative_to_c_i_scatter = v_relative_to_c_i_magnitude * Math.sin(alpha_new);

              molecule[i].xvelocity = v_x_c + v_x_relative_to_c_i_scatter;
              molecule[i].yvelocity = v_y_c + v_y_relative_to_c_i_scatter;
              molecule[j].xvelocity = v_x_c - v_x_relative_to_c_i_scatter * mass_i / mass_j;
              molecule[j].yvelocity = v_y_c - v_y_relative_to_c_i_scatter * mass_i / mass_j;

              molecule[i].xvalue += molecule[i].xvelocity;
              molecule[i].yvalue += molecule[i].yvelocity;
              molecule[j].xvalue += molecule[j].xvelocity;
              molecule[j].yvalue += molecule[j].yvelocity;//After the speed changed, they parted ways.
              //drawParticles();
              molecule[i].xclass = Math.floor(molecule[i].xvalue / (canvasSize / 10));
              molecule[i].yclass = Math.floor(molecule[i].yvalue / (canvasSize / 10));
              molecule[j].xclass = Math.floor(molecule[j].xvalue / (canvasSize / 10));
              molecule[j].yclass = Math.floor(molecule[j].yvalue / (canvasSize / 10));
            }
          }
        }
      }
    }
  }
}

function saveCanvasFrame(frameNumber) {
  var canvas = document.getElementById('myCanvas');
  var dataURL = canvas.toDataURL('image/png');
  var link = document.createElement('a');
  link.href = dataURL;
  link.download = `simulation_frame_${String(frameNumber).padStart(4, '0')}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function motion() {
  var count = 0;
  var savedImageCount = 0;
  collision_count = 0;
  timer = setInterval(function () {
    var collision_last_count = collision_count;
    count += 1;
    move();
    drawParticles();

    // Save every 100ms (10 frames) for 10 seconds (100 images)
    if (count % 10 === 0 && savedImageCount < 100) {
      saveCanvasFrame(savedImageCount);
      savedImageCount++;
    }

    if (trajectoryState) drawTrajectory();
    if (count % 100 == 0) {
      distplot();
    }
    if (collision_count === collision_last_count) {
      collision_x[collision_count] = undefined;
      collision_y[collision_count] = undefined;
      collision_count_current = collision_count;
      collision_count = (collision_count + 1) % collision_count_limit;
    }
    if (monitorState) createMonitor();
  }, dT);
}

function changeTrajectoryState() {
  trajectoryState = (!trajectoryState);
  if (trajectoryState === false) {
    clearCanvas('myLayer');
    document.getElementById("trajectoryControl").innerHTML = "Show Trajectory";
  }
  else {
    document.getElementById("trajectoryControl").innerHTML = "Hide Trajectory";
  }
}
function changeMonitorState() {
  var checkbox = document.getElementById('monitorControl');
  monitorState = checkbox.checked;
  if (monitorState) {
    createMonitorBG();
  } else {
    clearCanvas('myMonitor_layer1');
    clearCanvas('myMonitor_layer2');
    clearCanvas('myMonitor_layer3');
  }
}
function changeBoundaryCondition() {
  periodicBoundary = (!periodicBoundary);
  document.getElementById("boundaryCondition").innerHTML = (periodicBoundary) ? "Rigid Boundary" : "Periodic Boundary";
}
function changeParameter() {
  var trialN = Number(document.getElementById('Number').value);
  var trialR = Number(document.getElementById('upperRadius').value);
  if (trialN < 100 || trialN > 1200) {
    alert('N is not in the range of [100,1200]')
  }
  else if (trialR < 3 || trialR > 50) {
    alert('R is not in the range of [3,50]')
  }
  else {
    clearInterval(timer);
    clearCanvas("myCanvas");
    clearCanvas("myLayer");
    N = Number(document.getElementById("Number").value);
    R = Number(document.getElementById("upperRadius").value);
    IVD = document.getElementsByName("IVD");
    IVD = (IVD[0].checked === true);
    initialize();
    drawParticles();
    distplot();
    //document.getElementById("show").innerHTML=N;
    motion();
  }
}

var MC1 = document.getElementById('myChart1');
var MC2 = document.getElementById('myChart2');
var dataValues_X = [];
var dataValues_Y = [];
var dataValues_line = [];
var dataLabels = [];
var bins = 30;
var start = -3;
var end = 3;
var delta = (end - start) / bins;
delta = delta.toPrecision(1);

function distplot() {
  for (var i = 0; i < bins; i++) {
    dataLabels[i] = (start + i * delta).toPrecision(2);
    dataValues_X[i] = 0;
    dataValues_Y[i] = 0;
    dataValues_line[i] = 1 / Math.sqrt(2 * Math.PI) * Math.exp(-Math.pow(dataLabels[i], 2) / 2) * N * delta;
  }
  for (var i = 1; i < N + 1; i++) {
    var x = Math.floor((molecule[i].xvelocity - start) / delta);
    var y = Math.floor((molecule[i].yvelocity - start) / delta);
    dataValues_X[x] += 1;
    dataValues_Y[y] += 1;
  }
  var barChartData = {
    labels: dataLabels,
    datasets: [{
      label: 'velocity along x axis',
      backgroundColor: 'rgba(106,90,205,0.5)',
      data: dataValues_X
    }, {
      label: 'velocity along y axis',
      backgroundColor: 'rgba(154,205,50,0.7)',
      data: dataValues_Y
    }, {
      label: 'Maxwell\'s velocity distribution',
      data: dataValues_line,
      type: 'line',
      borderColor: 'rgba(211,211,211,0.5)',
      backgroundColor: 'rgba(211,211,211,0.5)',
      fill: false
    }]
  };

  var myChart1 = new Chart(MC1, {
    type: 'bar',
    data: barChartData,
    options: {
      hover: {
        animationDuration: 0 // duration of animations when hovering an item
      },
      responsiveAnimationDuration: 0,// animation duration after a resize
      animation: {
        duration: 0 // general animation time
      },
      scales: {
        barPercentage: 1,
        xAxes: [{
          display: true,
          ticks: {
            autoSkip: false,
            min: -2,
            max: 2
          },
          scaleLabel: {
            display: true,
            labelString: 'velocity'
          }
        }],
        yAxes: [{
          //stacked:true,
          ticks: {
            beginAtZero: true,
            min: 0,
            max: Math.floor(N / 80) * 10
          },
          scaleLabel: {
            display: true,
            labelString: 'count'
          }
        }]
      }
    }
  });
  /*var myChart2 = new Chart(MC2, {
      type: 'bar',
      data: {
          labels: dataLabels,
          datasets: [{
              label: 'velocity along y axis',
              data: dataValues_Y,
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
          }]
      },
      options: {
          animation: {
              duration: 200 // general animation time
          },
      scales: {
          xAxes: [{
          display: true,
          ticks: {
              autoSkip: false,
              min:-2,
              max:2
          },
          barPercentage:1
        }],
        yAxes: [{
          ticks: {
              beginAtZero:true,
              min:0,
              max:100
          }
        }]
      }
    }
  });*/
}

function createMonitorBG() {
  clearCanvas("myMonitor_layer1");
  clearCanvas("myMonitor_layer3");
  //下層
  var cs_monitor_1 = document.getElementById("myMonitor_layer1");
  var ctx_monitor_1 = cs_monitor_1.getContext("2d");
  ctx_monitor_1.fillStyle = "rgba(205,92,92,0.7)";
  ctx_monitor_1.beginPath();
  ctx_monitor_1.arc(60, 60, R, 0, 2 * Math.PI);
  ctx_monitor_1.closePath();
  ctx_monitor_1.fill();
  //上層
  var cs_monitor_3 = document.getElementById("myMonitor_layer3");
  var ctx_monitor_3 = cs_monitor_3.getContext("2d");
  ctx_monitor_3.fillStyle = "#ffffff";
  ctx_monitor_3.arc(60, 60, 100, 0, 2 * Math.PI, false);
  ctx_monitor_3.arc(60, 60, R + 1, 0, 2 * Math.PI, true);
  ctx_monitor_3.fill();
}

function createMonitor() {
  //中層
  clearCanvas("myMonitor_layer2");
  var cs_monitor_2 = document.getElementById("myMonitor_layer2");
  var ctx_monitor_2 = cs_monitor_2.getContext("2d");
  for (var i = 0; i < collision_count_limit; i++) {
    ctx_monitor_2.fillStyle = "#FFFF00";
    if (i <= collision_count_current) ctx_monitor_2.globalAlpha = (1 - Math.pow((collision_count_current - i) / collision_count_limit, 2));
    else ctx_monitor_2.globalAlpha = (1 - Math.pow((collision_count_current + collision_count_limit - i) / collision_count_limit, 2));
    ctx_monitor_2.beginPath();
    ctx_monitor_2.arc(60 + collision_x[i] * R, 60 + collision_y[i] * R, 5, 0, 2 * Math.PI); // Changed to 5 for small particle visualization
    ctx_monitor_2.closePath();     //パスを閉じる
    ctx_monitor_2.fill();
  }
}


