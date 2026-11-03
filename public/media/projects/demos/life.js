let animationId;
let canvas;
let context;
const colors = ["red", "orange", "yellow", "green", "blue", "purple"];
let habitat;
let radius = 5;
let isPaused = true;

let gradient = [];
for(let i = 0; i < 255; i += 255 / 10){
    gradient.push([255, i, 0]);
}
for(let i = 255; i >= 0; i -= 255 / 10){
    gradient.push([i, 255, 0]);
}
console.log(gradient);

let dynamicData = {
    labels: [],
    datasets: [{
        label: 'Dynamic Data',
        borderColor: 'rgb(75, 192, 192)',
        pointRadius: 0,
        fill: false,
        data: [],
    }]
};

let ctx = document.getElementById('chartCanvas').getContext('2d');
let eLine = new Chart(ctx, {
    type: 'line',
    data: dynamicData,
    options: {
        responsive: false,
        animation: {
            duration: 0
        },
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            xAxes: [{
                display: false,
            }],
            yAxes: [{
                ticks: {
                    beginAtZero: true,
                }
            }]
        }
    }
});

class Particle {
    constructor(type, x=Math.random(), y=Math.random(), vx=0, vy=0, fx=0, fy=0) {
        this.type = type;
        this.color = colors[type];
        this.x = x;
        this.y = y;
        this.cx = x * canvas.width;
        this.cy = canvas.height - y * canvas.height;
        this.vx = vx;
        this.vy = vy;
        this.fx = fx;
        this.fy = fy;
    }
}

class Habitat {
    constructor(step=0.001) {
        this.step = step;
        this.ke = 0;
        this.particles = [];
        this.forceArray = [];
        this.newForceArray();
    }

    newForceArray() {
        this.forceArray = []
        for (let i = 0; i < colors.length; i++) {
            let a1 = []
            for(let j = 0; j < colors.length; j++) {
                a1.push(Math.round(-10 + (Math.floor(Math.random() * 21))) / 10);
            }
            this.forceArray.push(a1);
        }
    }

    addParticle(particle){
        this.particles.push(particle);
    }

    randomDistribution(n=500) {
        this.particles = [];
        for (let i = 0; i < n; i++) {
            this.addParticle(new Particle(Math.floor(Math.random() * colors.length)));
        }
    }

    updateForce() {

        let omega = 50; // border
        let threshold = 30; // v threshold
        let alpha = radius * document.getElementById('radius').value; // max dist
        let beta = radius * 5; // min dist
        let mag = 10 ** document.getElementById('forceMag').value;

        this.particles.forEach(particle => {
            particle.fx = 0;
            particle.fy = 0;
            
            if(document.getElementById('looping').checked){
                if(particle.cx < omega && Math.abs(particle.vx) < threshold){
                    particle.fx += mag * (omega - particle.cx);
                } if (canvas.width - particle.cx < omega && Math.abs(particle.vx) < threshold) {
                    particle.fx -= mag * (omega - (canvas.width - particle.cx));
                } if (particle.cy < omega && Math.abs(particle.vy) < threshold) {
                    particle.fy += mag * (omega - particle.cy);
                } if (canvas.height - particle.cy < omega && Math.abs(particle.vy) < threshold) {
                    particle.fy -= mag * (omega - (canvas.height - particle.cy));
                }
            } else {
                let exp = 2;
                if(particle.cx < omega){
                    particle.fx += mag * (omega - particle.cx) ** exp;
                } if (canvas.width - particle.cx < omega) {
                    particle.fx -= mag * (omega - (canvas.width - particle.cx)) ** exp;
                } if (particle.cy < omega) {
                    particle.fy += mag * (omega - particle.cy) ** exp;
                } if (canvas.height - particle.cy < omega) {
                    particle.fy -= mag * (omega - (canvas.height - particle.cy)) ** exp;
                }
            }
            

            this.particles.forEach(other => { 
                if (particle !== other) {
                    let dx = other.cx - particle.cx;
                    let dy = other.cy - particle.cy;
                    let r = Math.sqrt(dx ** 2 + dy ** 2);
                    let f = 0;
                    let c;
                    
                    if(r < beta) {
                        f = (r / beta - 1) * mag * 10;
                    } else if (r < alpha) {
                        c = this.forceArray[particle.type][other.type] * mag;
                        f = c * (1 - Math.abs(2 * r - 1 - beta) / (1 - beta));
                    }

                    particle.fx += f * dx / r;
                    particle.fy += f * dy / r;
                }
            });
        });
    }

    updateVelocity(damping=(1 - document.getElementById('friction').value)) {
        let energy = 0;
        this.particles.forEach(particle => {
            particle.vx = (particle.vx + this.step * particle.fx) * damping;
            particle.vy = (particle.vy + this.step * particle.fy) * damping;
            if(Math.sqrt(particle.vx ** 2 + particle.vy ** 2) > 100000) {
                particle.vx = particle.vx / Math.sqrt(particle.vx ** 2 + particle.vy ** 2) * 100000;
                particle.vy = particle.vy / Math.sqrt(particle.vx ** 2 + particle.vy ** 2) * 100000;
            }
            let increment = (particle.vx ** 2 + particle.vy ** 2) / 20000000;
            increment = Math.min(increment, 500);
            energy += increment;
        });
        this.ke = energy;
    }

    updatePosition() {
        this.particles.forEach(particle => {
            particle.cx += this.step * particle.vx;
            particle.cy += this.step * particle.vy;
            particle.x = particle.cx / canvas.width;
            particle.y = 1 - particle.cy / canvas.height;

            if(document.getElementById('looping').checked){
                if(particle.x < 0) {
                    particle.x = 1 + particle.x;
                } if(particle.x > 1) {
                    particle.x = 1 - particle.x;
                } if(particle.y < 0) {
                    particle.y = 1 + particle.y;
                } if(particle.y > 1) {
                    particle.y = 1 - particle.y;
                }
            } else {
                if(particle.x < 0) {
                    particle.x = 0;
                } if(particle.x > 1) {
                    particle.x = 1;
                } if(particle.y < 0) {
                    particle.y = 0;
                } if(particle.y > 1) {
                    particle.y = 1;
                }
            }
            
            particle.cx = particle.x * canvas.width;
            particle.cy = canvas.height - particle.y * canvas.height;
        });
    }

    plotHabitat() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = "black";
        context.lineWidth = 2;
        this.particles.forEach(particle => {
            context.beginPath();
            context.fillStyle = particle.color;
            context.arc(particle.cx, particle.cy, radius, 0, 2 * Math.PI);
            context.fill();
            context.stroke();
        });
    }
}

function updateChartData(newData) {

    eLine.data.labels.push('');
    eLine.data.datasets[0].data.push(newData);

    if (eLine.data.labels.length > 100) {
        eLine.data.labels.shift();
        eLine.data.datasets[0].data.shift();
    }

    eLine.update();
}

function shuffleHabitat() {
    habitat.randomDistribution(document.getElementById('particleCount').value);
}

function updateHabitat() {

    cancelAnimationFrame(animationId);
    habitat = new Habitat();
    habitat.randomDistribution(document.getElementById('particleCount').value);
    habitat.plotHabitat();
    console.log(habitat.forceArray);

    colorGrid();

    function animate() {
        if(!isPaused) {
            habitat.updateForce();
            habitat.updateVelocity();
            habitat.updatePosition();
            habitat.plotHabitat();
            document.getElementById('energyValue').textContent = habitat.ke.toFixed(2);
            updateChartData(habitat.ke);
        }
        animationId = requestAnimationFrame(animate);
    }
    animate();
}

function setColor(i, j, inc=0.1) {
    let block = document.getElementById('f-' + i + '' + j);
    if(inc){
        habitat.forceArray[i][j] += inc;
        if(habitat.forceArray[i][j] > 1) {
            habitat.forceArray[i][j] = -1;
        }
        if(habitat.forceArray[i][j] < -1) {
            habitat.forceArray[i][j] = 1;
        }
    }
    let idx = Math.round((habitat.forceArray[i][j] + 1) * 10);
    console.log(idx);
    let r = gradient[idx][0];
    let g = gradient[idx][1];
    let b = gradient[idx][2];
    block.style.backgroundColor = 'rgb(' + r + ',' + g + ',' + b + ')';
}

function colorGrid() {
    for(let i = 0; i < colors.length; i++) {
        for(let j = 0; j < colors.length; j++) {
            setColor(i, j, inc=0);
        }
    }
}

function inBounds(event, min, max, int) {
    const input = event.target;
    if(input.value === "") {
        return;
    } else if (input.value < min) {
        input.value = min;
    } else if (input.value > max) {
        input.value = max;
    } else if (int) {
        input.value = Math.floor(input.value);
    }
}

function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pauseButton').textContent = isPaused ? 'Resume' : 'Pause simulation';
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if(habitat){
        habitat.plotHabitat();
    }
}

window.onload = function() {
    canvas = document.getElementById("graphCanvas");
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    context = canvas.getContext("2d");
    updateHabitat();
    togglePause();
}