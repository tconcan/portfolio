let animationId;
let canvas;
let context;
let mode = "random";
let isPaused = true;
let minDim = Math.min(window.innerWidth, window.innerHeight);

let kmeans_run = false;
let kmeans_num = 0;
let centroids;

let dijkstras_run = false;
let graph;

class Knode {
    constructor(color, x, y, radius=12, vx=0, vy=0, fx=0, fy=0){
        this.color = color;
        this.radius = radius;
        this.x = x;
        this.y = y;
        this.ax = 0;
        this.ay = 0;
        this.cx = x * canvas.width;
        this.cy = canvas.height - y * canvas.height;
        this.nx = [];
        this.ny = [];
        this.vx = vx;
        this.vy = vy;
        this.fx = fx;
        this.fy = fy;
        this.convergence = false;
    }
}

class Gnode {
    constructor(name, color="red", radius=7,
        x=Math.random(), y=Math.random(),
        vx=0, vy=0, fx=0, fy=0) {
        
        this.name = name;
        this.adj = [];
        this.edges = [];
        this.degree = 0;
        this.color = color;
        this.radius = radius;
        this.x = x;
        this.y = y;
        this.cx = x * canvas.width;
        this.cy = canvas.height - y * canvas.height;
        this.vx = vx;
        this.vy = vy;
        this.fx = fx;
        this.fy = fy;
        this.dist = Number.MAX_VALUE;
        this.prev = null;
        this.path = [];
    }
}

class Edge {
    constructor(node1, node2, color="black", width=1) {
        this.node1 = node1;
        this.node2 = node2;
        this.color = color;
        this.width = width;
        this.weight = 1;
    }
}

class Graph {
    constructor() {
        this.nodes = [];
        this.edges = [];
    }

    addNode(node){
        this.nodes.push(node);
    }

    setNodeColor(color) {
        this.nodes.forEach(node => {
            node.color = color;
        });
    }

    getNodes() {
        return this.nodes;
    }

    addEdge(edge){
        this.edges.push(edge);
        edge.node1.adj.push(edge.node2);
        edge.node1.edges.push(edge);
        edge.node1.degree += 1;
        edge.node2.adj.push(edge.node1);
        edge.node2.edges.push(edge);
        edge.node2.degree += 1;
    }

    setEdgeColor(color) {
        this.edges.forEach(edge => {
            edge.color = color;
        });
    }

    getEdges() {
        return this.edges;
    }

    calculateEdgeWeights() {
        this.edges.forEach(edge => {
            let dx = edge.node1.cx - edge.node2.cx;
            let dy = edge.node1.cy - edge.node2.cy;
            edge.weight = Math.sqrt(dx ** 2 + dy ** 2);
        });
    }

    generateRandom(n, density, maxDegree, s=0, color=document.getElementById("colorPicker").value, radius=7) {

        for(let i = s; i < n + s; i++){
            this.addNode(new Gnode("Node " + i.toString(), color=color, radius=radius));
        }
        if(maxDegree > n - 1){
            maxDegree = n - 1;
        }
        let numEdges = Math.floor(density * n * maxDegree / 2);
        let j = 0;
        let i = 0;  
        while(i < numEdges && j < numEdges * 100){
            let node1 = this.nodes[Math.floor(Math.random() * n) + s];
            let node2 = this.nodes[Math.floor(Math.random() * n) + s];
            if (node1 !== node2 && !node1.adj.includes(node2) && node1.degree < maxDegree && node2.degree < maxDegree) {
                this.addEdge(new Edge(node1, node2));
            } else {
                i--; 
            }
            i++;
            j++;
        }
    }

    generateStarfish(arms, armLength, color=document.getElementById("colorPicker").value, radius=7) {
        
        for(let i = 0; i < arms * armLength + 1; i++){
            this.addNode(new Gnode("Node " + i.toString(), color=color, radius=radius));
        }
        let node = 1;
        for(let arm = 0; arm < arms; arm++){
            let prev = 0;
            while(node < arm * armLength + armLength + 1) {
                this.addEdge(new Edge(this.nodes[prev], this.nodes[node]));
                prev = node;
                node++;
            }
        }
    }

    generateFlower(petals, petalSize, color=document.getElementById("colorPicker").value, radius=7) {
        
        for(let i = 0; i < petals * petalSize + 1; i++) {
            this.addNode(new Gnode("Node " + i.toString(), color=color, radius=radius));
        }
        let node = 1;
        for(let petal = 0; petal < petals; petal++){
            let prev = 0;
            while(node < petal * petalSize + petalSize + 1){
                this.addEdge(new Edge(this.nodes[prev], this.nodes[node]));
                prev = node;
                node++;
            }
            this.addEdge(new Edge(this.nodes[prev], this.nodes[0]));
        }
    }

    generateFractal(depth, degree, color=document.getElementById("colorPicker").value, radius=7) {
        
        let numNodes = 0;
        for(let i = 0; i <= depth; i++){
            numNodes += degree ** i;
        }
        for(let i = 0; i < numNodes; i++){
            this.addNode(new Gnode("Node " + i.toString(), color=color, radius=radius));
        }

        let numRoots = numNodes - degree ** depth;
        for(let i = 0; i < numRoots; i++){
            for(let j = 0; j < degree; j++){
                this.addEdge(new Edge(this.nodes[i], this.nodes[i * degree + j + 1]));
            }
        }

    }

    generateMini(size, density, amount, color=document.getElementById("colorPicker").value, radius=7) {
        
        for(let i = 0; i < amount; i++){
            this.generateRandom(size, density, size - 1, i*size, color, radius);
        }

    }

    generateClusters(size, amount, variability, color=document.getElementById("colorPicker").value, radius=7) {
        
        let con = Math.floor(size * amount / 10);
        let idx = 0;
        
        for(let i = 0; i < amount; i++){
            let cluster_size = size + Math.floor(size * ((Math.random() - 0.5) * 2 * variability));
            console.log(cluster_size)
            this.generateRandom(cluster_size, 0.7, size - 1, idx, color, radius);
            idx += cluster_size;
        }

        let j = 0;
        let i = 0;  
        while(i < con && j < con * 100){
            let n1 = Math.floor(Math.random() * this.nodes.length);
            let n2 = Math.floor(Math.random() * this.nodes.length);
            let node1 = this.nodes[n1];
            let node2 = this.nodes[n2];
            if (node1 !== node2 && !node1.adj.includes(node2)) {
                this.addEdge(new Edge(node1, node2));
            } else {
                i--; 
            }
            i++;
            j++;
        }
    }

    generateLattice(size, shape, color=document.getElementById("colorPicker").value, radius=7) {

        if (shape === "triangle") {
            for (let i = 0; i < size * (size + 1) / 2; i++) {
                this.addNode(new Gnode("Node " + i.toString(), color=color, radius=radius));
            }

            let k = 0;
            let m = size;
            for (let j = 0; j < size; j++){
                for (let i = 0; i < size - j; i++){
                    if(i < size - j - 1){
                        this.addEdge(new Edge(graph.nodes[k], graph.nodes[k + 1]));
                    }
                    if(m > 1){
                        if(i > 0){
                            this.addEdge(new Edge(graph.nodes[k], graph.nodes[k + m - 1]));
                        }
                        if(i < size - j - 1){
                            this.addEdge(new Edge(graph.nodes[k], graph.nodes[k + m]));
                        }
                    }
                    k++;
                }
                m--;
            }
        }
        
        if (shape === "square") {

            for (let i = 0; i < size ** 2; i++) {
                this.addNode(new Gnode("Node " + i.toString(), color=color, radius=radius));
            }

            for (let j = 0; j < size; j++){
                for (let i = 0; i < size; i++){
                    if(i < size - 1){
                        this.addEdge(new Edge(graph.nodes[j * size + i], graph.nodes[j * size + i + 1]));
                    }
                    if(j < size - 1){
                        this.addEdge(new Edge(graph.nodes[j * size + i], graph.nodes[(j + 1) * size + i]));
                    }
                }
            }
        }

        if (shape === "hexagon") {
            
            let row = size * 2 + 1;
            let count = 0;
            
            while(row <= size * 4 - 1){
                for(let i = 0; i < row; i++){
                    this.addNode(new Gnode("Node " + count.toString(), color=color, radius=radius));
                    if(i > 0){
                        this.addEdge(new Edge(this.nodes[count], this.nodes[count - 1]));
                    }
                    count += 1;
                }
                row += 2
            }
            row -= 2;

            while(row >= size * 2 + 1){
                for(let i = 0; i < row; i++){
                    this.addNode(new Gnode("Node " + count.toString(), color=color, radius=radius));
                    if(i > 0){
                        this.addEdge(new Edge(this.nodes[count], this.nodes[count - 1]));
                    }
                    count += 1;
                }
                row -= 2
            }

            let end = graph.nodes.length - 1;
            row = size * 2 + 1;
            let done = row;
            let node1 = 0;
            let node2 = end;
        
            while(row < size * 4 - 1){
                while(node1 < done){
                    this.addEdge(new Edge(this.nodes[node1], this.nodes[node1 + row + 1]));
                    this.addEdge(new Edge(this.nodes[node2], this.nodes[node2 - row - 1]));
                    node1 += 2;
                    node2 -= 2;
                }
                row += 2;
                done += row;
                node1 -= 1;
                node2 += 1;
            }
            while(node1 < done){
                this.addEdge(new Edge(this.nodes[node1], this.nodes[node1 + row]));
                node1 += 2;
            }
        }

    }

    generateMobius(length, width, color=document.getElementById("colorPicker").value, radius=7) {

        for (let i = 0; i < length * width; i++) {
            this.addNode(new Gnode("Node " + i.toString(), color=color, radius=radius));
        }

        for (let j = 0; j < length; j++){
            for (let i = 0; i < width; i++){
                if(i < width - 1){
                    this.addEdge(new Edge(graph.nodes[j * width + i], graph.nodes[j * width + i + 1]));
                }
                if(j < length - 1){
                    this.addEdge(new Edge(graph.nodes[j * width + i], graph.nodes[(j + 1) * width + i]));
                }
            }
        }

        let end = graph.nodes.length;
        for(let i = 0; i < width; i++){
            this.addEdge(new Edge(graph.nodes[i], graph.nodes[end - i - 1]));
        }
    }

    generateEdgeList(edgeList, color=document.getElementById("colorPicker").value, radius=7) {
        const lines = edgeList.split('\n');
        const nodeMap = new Map();

        for(let line of lines){
            const [name1, name2] = line.split(',').map(s => s.trim());
            let node1 = nodeMap.get(name1);
            if (!node1) {
                node1 = new Gnode(name1, color, radius);
                this.addNode(node1);
                nodeMap.set(name1, node1);
            }
            
            let node2 = nodeMap.get(name2);
            if (!node2) {
                node2 = new Gnode(name2, color, radius);
                this.addNode(node2);
                nodeMap.set(name2, node2);
            }
            
            this.addEdge(new Edge(node1, node2));
        }
    }

    resetColor(){
        this.setNodeColor(document.getElementById("colorPicker").value);
        this.setEdgeColor("black");
    }

    plotGraph() {
        this.edges.forEach(edge => {
            context.beginPath();
            context.strokeStyle = edge.color;
            context.lineWidth = edge.width;
            context.moveTo(edge.node1.cx, edge.node1.cy);
            context.lineTo(edge.node2.cx, edge.node2.cy);
            context.stroke();
        });
        context.strokeStyle = "black";
        context.lineWidth = 2;
        this.nodes.forEach(node => {
            context.beginPath();
            context.fillStyle = node.color;
            context.arc(node.cx, node.cy, node.radius, 0, 2 * Math.PI);
            context.fill();
            context.stroke();
        });
    }
}

function resetGraph() {
    if(graph){
        graph.resetColor();
        context.clearRect(0, 0, canvas.width, canvas.height);
        graph.plotGraph();
    }
}

function updateForce(nodes, r, a, g) {

    let f = 0;
    let fmax = 10000000

    nodes.forEach(node => {
        node.fx = 0;
        node.fy = 0;

        // Repulsion
        nodes.forEach(other => {
            if (node !== other) {
                let dx = (node.cx - other.cx) / canvas.width;
                let dy = - (node.cy - other.cy) / canvas.height;
                let d = Math.sqrt(dx * dx + dy * dy);
                let f = r / d ** 2;
                node.fx += f * dx;
                node.fy += f * dy;
            }
        });

        // Attraction
        node.adj.forEach(other => {
            let dx = (node.cx - other.cx) / canvas.width;
            let dy = - (node.cy - other.cy) / canvas.height;
            let d = Math.sqrt(dx * dx + dy * dy);
            let f = - a * d;
            node.fx += f * dx;
            node.fy += f * dy;
        });

        // Gravity
        node.fx += g * (canvas.width / 2 + 184 - node.cx);
        node.fy += g * (canvas.height / 2 - (canvas.height - node.cy));

        // Max
        let fnet = Math.sqrt(node.fx ** 2 + node.fy ** 2)
        if (fnet > fmax) {
            node.fx = (node.fx / fnet) * fmax
            node.fy = (node.fy / fnet) * fmax
        }
    });

    avgf = f / nodes.length;
    return avgf;
}

function updateVel(nodes, stepSize, damping) {

    nodes.forEach(node => {
        node.vx = (node.vx + stepSize * node.fx) * damping;
        node.vy = (node.vy + stepSize * node.fy) * damping;
    });
}

function updatePos(nodes, stepSize) {

    nodes.forEach(node => {
        node.x += stepSize * node.vx;
        node.y += stepSize * node.vy;
        node.cx = node.x * canvas.width;
        node.cy = canvas.height - node.y * canvas.height;
    });
}

function verifyEdgeList(edgeList) {

    if (edgeList === "") {
        return true;
    }

    const lines = edgeList.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if(!/^[\w\s\d\-']+, [\w\s\d\-']+$/.test(lines[i])) {
            return false;
        }
    }
    return true;
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

    dijkstra_btn = document.getElementById("dijkstra-button");
    kmeans_btn = document.getElementById("kmeans-button");
    if(isPaused){
        dijkstra_btn.disabled = false;
        kmeans_btn.disabled = false;
    } else {
        dijkstra_btn.disabled = true;
        kmeans_btn.disabled = true;
        dijkstras_run = false;
        kmeans_run = false;
        resetGraph();
    }
}

function changeMode(newMode) {
    mode = newMode;
}

function updateGraph() {

    kmeans_run = false;
    dijkstras_run = false;

    cancelAnimationFrame(animationId);
    if (mode === "random") {
        const nodes = parseInt(document.getElementById("nodes").value);
        const density = parseFloat(document.getElementById("density").value);
        const maxDegree = parseInt(document.getElementById("maxDegree").value);
        graph = new Graph();
        graph.generateRandom(nodes, density, maxDegree);
    } else if (mode === "star") {
        const arms = parseInt(document.getElementById("arms").value);
        const armsLength = parseInt(document.getElementById("arm_length").value);
        graph = new Graph();
        graph.generateStarfish(arms, armsLength);
    } else if (mode === "flower") {
        const petals = parseInt(document.getElementById("petals").value);
        const petalSize = parseInt(document.getElementById("petal_size").value);
        graph = new Graph();
        graph.generateFlower(petals, petalSize);
    } else if (mode === "fractal") {
        const depth = parseInt(document.getElementById("depth").value);
        const degree = parseInt(document.getElementById("degree").value);
        graph = new Graph();
        graph.generateFractal(depth, degree);
    } else if (mode === "mini") {
        const size = parseInt(document.getElementById("mini-size").value);
        const density = parseFloat(document.getElementById("mini-density").value);
        const amount = parseInt(document.getElementById("mini-amount").value);
        graph = new Graph();
        graph.generateMini(size, density, amount);
    } else if (mode === "clusters") {
        const size = parseInt(document.getElementById("cluster-size").value);
        const amount = parseInt(document.getElementById("cluster-amount").value);
        const variablity = parseFloat(document.getElementById("variability").value);
        graph = new Graph();
        graph.generateClusters(size, amount, variablity);
    } else if (mode === "lattice") {
        const size = parseInt(document.getElementById("lattice-size").value);
        graph = new Graph();
        if (document.getElementById("triangle").checked) {
            graph.generateLattice(size, "triangle");
        } else if (document.getElementById("square").checked) {
            graph.generateLattice(size, "square");
        } else {
            graph.generateLattice(size, "hexagon");
        }
    } else if (mode === "mobius") {
        const length = parseInt(document.getElementById("mobius-length").value);
        const width = parseInt(document.getElementById("mobius-width").value);
        graph = new Graph();
        graph.generateMobius(length, width);
    } else if (mode === "edge") {
        const edgeList = document.getElementById("edges").value.trim();
        if(!verifyEdgeList(edgeList)) {
            alert("Please enter edges in the format 'Node1, Node2'.");
        }
        else {
            graph = new Graph();
            if (edgeList !== ""){
                graph.generateEdgeList(edgeList);
            }
        }
    }

    graph.setNodeColor(document.getElementById("colorPicker").value);
    context.clearRect(0, 0, canvas.width, canvas.height);
    graph.plotGraph();

    function animate() {
        if(!isPaused) {
            nodeColor = document.getElementById("colorPicker").value;
            let k1 = 10 ** document.getElementById("sliderR").value;
            if (k1 == 1) {
                k1 = 0;
            }
            let k2 = 10 ** document.getElementById("sliderA").value;
            if (k2 == 1) {
                k2 = 0;
            }
            let k3 = 10 ** document.getElementById("sliderG").value;
            if (k3 == 1) {
                k3 = 0;
            }
            let k4 = 1 - document.getElementById("sliderF").value;
            let avgf = updateForce(graph.nodes, k1, k2, k3);
            updateVel(graph.nodes, 0.0001, k4);
            updatePos(graph.nodes, 0.0001);
            graph.setNodeColor(nodeColor);
            context.clearRect(0, 0, canvas.width, canvas.height);
            graph.plotGraph();
        }
        animationId = requestAnimationFrame(animate);
    }
    animate();
}

function shuffleArray(array) {
    const newArray = array.slice();
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function plotKmeans(centroids) {
    centroids.forEach(centroid => {
        context.beginPath();
        context.fillStyle = centroid.color;
        context.arc(centroid.cx, centroid.cy, centroid.radius, 0, 2 * Math.PI);
        context.fill();
        context.stroke();
    });
}

function kmeans() {

    resetGraph();

    kmeans_run = true
    dijkstras_run = false;
    document.getElementById("dijkstra-button").disabled = true;
    document.getElementById("kmeans-button").disabled = true;

    let colors = shuffleArray(["crimson", "salmon", "deeppink", "coral", "orangered", 
              "orange", "gold", "khaki", "plum", "mediumorchid", 
              "darkorchid", "mediumslateblue", "limegreen", "yellowgreen", "darkturquoise", 
              "steelblue", "deepskyblue", "goldenrod", "chocolate", "forestgreen"]);
    
    let numClusters = document.getElementById("clusters").value;

    let pos_x = [];
    let pos_y = [];
    graph.getNodes().forEach(node => {
        pos_x.push(node.x);
        pos_y.push(node.y);
    });
    let avg_x = pos_x.reduce((a, b) => a + b) / pos_x.length;
    let std_x = Math.sqrt(pos_x.map(x => (x - avg_x) ** 2).reduce((a, b) => a + b) / pos_x.length);
    let avg_y = pos_y.reduce((a, b) => a + b) / pos_y.length;
    let std_y = Math.sqrt(pos_y.map(y => (y - avg_y) ** 2).reduce((a, b) => a + b) / pos_y.length);
    centroids = [];
    for(let i = 0; i < numClusters; i++) {
        let u1 = Math.random();
        let u2 = Math.random();
        let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        let z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
        let x = z0 * std_x + avg_x;
        let y = z1 * std_y + avg_y;
        centroids.push(new Knode(colors[i], x, y));
    }

    let convergence = false;
    const g = 1000000;
    const value = 0.0001; 

    function mainLoop() {

        if(!kmeans_run || !isPaused) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            graph.plotGraph();
            return;
        }

        convergence = false;
        graph.getNodes().forEach(node => {
            let minDist = Number.MAX_VALUE;
            let minCentroid;
            centroids.forEach(centroid => {
                let dist = Math.sqrt((node.cx - centroid.cx) ** 2 + (node.cy - centroid.cy) ** 2);
                if (dist < minDist) {
                    minDist = dist;
                    minCentroid = centroid;
                    node.color = centroid.color;
                }});
            minCentroid.nx.push(node.x);
            minCentroid.ny.push(node.y);
        });

        centroids.forEach(centroid => {
            if (centroid.nx.length === 0) {
                    centroid.nx.push(centroid.x);
                    centroid.ny.push(centroid.y);
            }
            let sum_x = centroid.nx.reduce((a, b) => a + b, 0);
            let sum_y = centroid.ny.reduce((a, b) => a + b, 0);
            let avg_x = sum_x / centroid.nx.length;
            let avg_y = sum_y / centroid.ny.length;
            centroid.ax = avg_x;
            centroid.ay = avg_y;
            centroid.nx = [];
            centroid.ny = [];
        });

        function animate() {
            if(isPaused && kmeans_run) {
                centroids.forEach(centroid => {
                    centroid.fx = g * (centroid.ax - centroid.x);
                    centroid.fy = g * (centroid.ay - centroid.y);
                    if (centroid.fx === 0 && centroid.fy === 0) {
                        centroid.convergence = true;
                    } else {
                        centroid.convergence = false;
                    }
                });
                updateVel(centroids, 0.0001, 0.90);
                updatePos(centroids, 0.0001);
                context.clearRect(0, 0, canvas.width, canvas.height);
                graph.plotGraph();
                plotKmeans(centroids);
                convergence = true;
                centroids.forEach(centroid => {
                    if (Math.sqrt(centroid.vx ** 2 + centroid.vy ** 2) > value) {
                        convergence = false;
                    } else {
                        centroid.x = centroid.ax;
                        centroid.y = centroid.ay;
                    }
                });

                if (!convergence) {
                    requestAnimationFrame(animate);
                } else {
                    end = true;
                    centroids.forEach(centroid => {
                        console.log(centroid.convergence)
                        if (!centroid.convergence) {
                            end = false;
                        }
                    });
                    if (end) {
                        console.log("Convergence reached.");
                        const alertPlaceholder = document.getElementById('kmeansConverge')
                        const appendAlert = (message, type) => {
                            const wrapper = document.createElement('div')
                            wrapper.innerHTML = [
                                `<div class="alert alert-${type} alert-dismissible mt-3" role="alert">`,
                                `   <div>${message}</div>`,
                                '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" onclick="resetGraph()"></button>',
                                '</div>'
                            ].join('')
                                alertPlaceholder.append(wrapper)
                        document.getElementById("dijkstra-button").disabled = false;
                        document.getElementById("kmeans-button").disabled = false;
                        
                        }

                        appendAlert('Converged!', 'success');
                    } else {
                        mainLoop();
                    }
                }
            }
        }
        animate(); 
    }
    mainLoop(); 

}

function pause(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function dijkstras() {

    resetGraph();
    document.getElementById("dijkstra-button").disabled = true;
    document.getElementById("kmeans-button").disabled = true;
    dijkstras_run = true;
    kmeans_run = false;
    weighted = document.getElementById("weights").checked;
    color = document.getElementById("dijkstra-color").value

    if(weighted){
        graph.calculateEdgeWeights();
    }


    graph.getNodes().forEach(node => {
        node.dist = Number.MAX_VALUE;
        node.prev = null;
    });
    
    start = graph.getNodes()[Math.floor(Math.random() * graph.nodes.length) - 1];
    start.dist = 0;
    let unvisited = new Set(graph.getNodes());
    while(unvisited.size > 0 && isPaused && dijkstras_run) {
        let speed =  10 ** (3 - document.getElementById("dijkstra-speed").value);
        let minDist = Number.MAX_VALUE;
        let minNode = null;
        unvisited.forEach(node => {
            if(node.dist < minDist) {
                minDist = node.dist;
                minNode = node;
            }
        });

        if(minNode === null){
            break;
        }

        unvisited.delete(minNode);

        for (let neighbor of minNode.adj) {
            let edge = minNode.edges.find(edge => (edge.node1 === minNode && edge.node2 === neighbor) || (edge.node1 === neighbor && edge.node2 === minNode));
            let dist = minNode.dist + edge.weight;
            if(dist < neighbor.dist) {
                await pause(speed);
                if(neighbor.prev !== null){
                    prev_edge = neighbor.edges.find(edge => (edge.node1 === neighbor.prev && edge.node2 === neighbor) || (edge.node1 === neighbor && edge.node2 === neighbor.prev));
                    prev_edge.color = "black";
                }
                edge.color = color;                
                neighbor.color = color;
                context.clearRect(0, 0, canvas.width, canvas.height);
                graph.plotGraph();
                neighbor.dist = dist;
                neighbor.prev = minNode;
            }
        }
    }

    const alertPlaceholder = document.getElementById('dijkstraDone')
    const appendAlert = (message, type) => {
        const wrapper = document.createElement('div')
        wrapper.innerHTML = [
            `<div class="alert alert-${type} alert-dismissible mt-3" role="alert">`,
            `   <div>${message}</div>`,
            '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" onclick="resetGraph()"></button>',
            '</div>'
        ].join('')
            alertPlaceholder.append(wrapper)
    }

    document.getElementById("kmeans-button").disabled = false;
    document.getElementById("dijkstra-button").disabled = false;
    appendAlert('Done!', 'success');

}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    minDim = Math.min(window.innerWidth, window.innerHeight);
    if(graph){
        graph.plotGraph();
    }
    if(kmeans_run){
        plotKmeans(centroids);
    }
}

window.onload = function() {

    canvas = document.getElementById("graphCanvas");
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    context = canvas.getContext("2d");
    togglePause();
    changeMode(mode);
    updateGraph();
}