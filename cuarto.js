let fotoLatente;
let papelX, papelY;
let papelTam = 260;
let arrastrando = false;
let centroX; 

// Estados
let luzRoja = false;
let fotoFuera = false;
let fotoVelada = false;

// Química
let nivelRevelado = 0;
let reveladoDetenido = false;
let nivelFijado = 0;
let fotoFinalizada = false;

// Secado
let nivelSecado = 0;
let fotoSeca = false;
let zonaSecado;
let cubetas = [];

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-container');

    centroX = (width / 2) + 150; 
    papelX = centroX;
    papelY = height / 2 - 120;

    let dataURL = localStorage.getItem('fotoSapiens');
    if (dataURL) { fotoLatente = loadImage(dataURL); } 
    else {
        fotoLatente = createGraphics(400, 400);
        fotoLatente.background(255); fotoLatente.fill(0); fotoLatente.circle(200, 200, 150);
    }

    // --- SISTEMA DE CARGADO DE PARTIDA (Autoguardado) ---
    let progreso = localStorage.getItem('estadoCuartoOscuro');
    if (progreso) {
        let guardado = JSON.parse(progreso);
        fotoFuera = guardado.fotoFuera;
        fotoVelada = guardado.fotoVelada;
        nivelRevelado = guardado.nivelRevelado;
        reveladoDetenido = guardado.reveladoDetenido;
        nivelFijado = guardado.nivelFijado;
        fotoFinalizada = guardado.fotoFinalizada;
        nivelSecado = guardado.nivelSecado;
        fotoSeca = guardado.fotoSeca;
        papelX = guardado.papelX;
        papelY = guardado.papelY;
        luzRoja = guardado.luzRoja;

        if (fotoFuera) document.getElementById('btn-sacar').style.display = 'none';
        if (fotoSeca && !fotoVelada) document.getElementById('btn-descargar').style.display = 'block';
        
        let btnLuz = document.getElementById('btn-luz');
        if (luzRoja) {
            btnLuz.innerHTML = "🔴 LUZ DE SEGURIDAD (ROJA)";
            btnLuz.style.background = "#c0392b"; btnLuz.style.color = "#fff";
        }
    }
    // ----------------------------------------------------

    let cW = 250; let cH = 170; let cY = height - 180;
    cubetas = [
        {x: centroX - 280, y: cY, w: cW, h: cH, col: color(225, 215, 150, 220), borde: color(190, 180, 120), txt: "1. REVELADOR"},
        {x: centroX, y: cY, w: cW, h: cH, col: color(160, 190, 220, 220), borde: color(130, 160, 190), txt: "2. BANO DE PARO"},
        {x: centroX + 280, y: cY, w: cW, h: cH, col: color(230, 230, 235, 220), borde: color(190, 190, 200), txt: "3. FIJADOR"}
    ];
    zonaSecado = {x: width - 180, y: 160, w: 280, h: 220};
}

function draw() {
    if (luzRoja) background(60, 15, 15); else background(235, 235, 240); 
    rectMode(CENTER); imageMode(CENTER);

    function setSombra(blur, opacidad) {
        drawingContext.shadowOffsetX = 0; drawingContext.shadowOffsetY = blur / 2;
        drawingContext.shadowBlur = blur; drawingContext.shadowColor = `rgba(0, 0, 0, ${opacidad})`;
    }
    function resetSombra() { drawingContext.shadowColor = 'transparent'; }

    if (!fotoFuera) {
        setSombra(25, 0.4); fill(110, 95, 75); noStroke(); rect(centroX, height/2 - 120, 250, 190, 15); 
        resetSombra(); fill(0); ellipse(centroX, height/2 - 120, 30, 30); 
        fill(255); textSize(15); textAlign(CENTER, CENTER); textStyle(BOLD); text("CÁMARA ESTENOPEICA", centroX, height/2 - 190);
    }

    setSombra(20, 0.2); fill(40, 40, 45, 160); noStroke(); rect(zonaSecado.x, zonaSecado.y, zonaSecado.w, zonaSecado.h, 15);
    resetSombra(); stroke(180); strokeWeight(2); line(zonaSecado.x - zonaSecado.w/2 + 20, zonaSecado.y - 40, zonaSecado.x + zonaSecado.w/2 - 20, zonaSecado.y - 40);
    fill(255); noStroke(); textSize(15); textStyle(BOLD); textAlign(CENTER, CENTER); text("4. ZONA DE SECADO", zonaSecado.x, zonaSecado.y + zonaSecado.h/2 - 30);

    for (let i = 0; i < cubetas.length; i++) {
        let c = cubetas[i];
        setSombra(20, 0.3); fill(45, 45, 50); noStroke(); rect(c.x, c.y, c.w + 24, c.h + 24, 20); 
        resetSombra(); fill(c.col); stroke(c.borde); strokeWeight(2); rect(c.x, c.y, c.w, c.h, 10); 
        fill(255); noStroke(); textSize(16); textStyle(BOLD); text(c.txt, c.x, c.y + c.h/2 + 40);
    }

    let estadoTxt = "Apaga la luz blanca antes de abrir la caja.";
    let estadoCol = "#ffffff";

    if (fotoFuera) {
        let enRevelador = dist(papelX, papelY, cubetas[0].x, cubetas[0].y) < 120;
        let enParo = dist(papelX, papelY, cubetas[1].x, cubetas[1].y) < 120;
        let enFijador = dist(papelX, papelY, cubetas[2].x, cubetas[2].y) < 120;
        let enSecado = dist(papelX, papelY, zonaSecado.x, zonaSecado.y) < 130;

        if (fotoVelada) {
            estadoTxt = "¡ERROR! Has expuesto el papel a la luz blanca. La foto se ha quemado."; estadoCol = "#e74c3c";
        } else if (!arrastrando) {
            if (enRevelador) {
                if (!reveladoDetenido) { nivelRevelado += 0.4; estadoTxt = "Revelando cristales de plata... Controla el contraste."; estadoCol = "#f1c40f"; } 
                else { estadoTxt = "El revelador ha sido neutralizado por el baño de paro."; estadoCol = "#e74c3c"; }
            } else if (enParo) {
                reveladoDetenido = true; estadoTxt = "Reacción detenida por el ácido. Pasa el papel al fijador."; estadoCol = "#3498db"; 
            } else if (enFijador) {
                if (reveladoDetenido) {
                    nivelFijado += 0.8; estadoTxt = "Disolviendo plata no expuesta para fijar la imagen..."; estadoCol = "#2ecc71"; 
                    if (nivelFijado > 100) { fotoFinalizada = true; estadoTxt = "¡Fijado completo! Cuelga el papel en la zona de secado."; }
                } else { estadoTxt = "¡CUIDADO! Debes pasar por el Baño de Paro primero."; estadoCol = "#e74c3c"; }
            } else if (enSecado && fotoFinalizada) {
                if (!fotoSeca) {
                    nivelSecado += 0.5; estadoTxt = "Secando el papel... Espera unos segundos. (Puedes encender la luz)."; estadoCol = "#f39c12"; 
                    if (nivelSecado > 100) { fotoSeca = true; document.getElementById('btn-descargar').style.display = 'block'; }
                } else { estadoTxt = "¡FOTO SECA! Ya puedes usar el botón verde para descargarla."; estadoCol = "#2ecc71"; }
            } else { estadoTxt = fotoFinalizada ? "Cuelga el papel a secar en la cuerda." : "Arrastra el papel a la cubeta del Revelador."; }
        } else { estadoTxt = "Moviendo papel fotográfico..."; }

        push();
        translate(papelX, papelY);
        if (arrastrando) { scale(1.05); setSombra(30, 0.5); } else { setSombra(15, 0.3); }
        
        if (fotoVelada) {
            fill(20); noStroke(); rect(0, 0, papelTam, papelTam, 4); 
        } else {
            let tonoFondo = map(nivelRevelado, 0, 200, 250, 70);
            fill(constrain(tonoFondo, 70, 250)); noStroke(); rect(0, 0, papelTam, papelTam, 4);
            resetSombra(); 
            if (fotoLatente) { 
                push(); 
                blendMode(MULTIPLY); // FÍSICA QUÍMICA: La plata oscurece el papel
                tint(255, constrain(nivelRevelado, 0, 255)); 
                image(fotoLatente, 0, 0, papelTam - 12, papelTam - 12); 
                noTint(); 
                pop(); 
            }
        }
        pop(); resetSombra();
    }

    let textoUI = document.getElementById('estado-quimico');
    if (textoUI) { textoUI.innerText = estadoTxt; textoUI.style.color = estadoCol; }

    // --- AUTOGUARDADO (2 veces por segundo para no saturar el navegador) ---
    if (frameCount % 30 === 0) {
        let estadoActual = {
            fotoFuera: fotoFuera, fotoVelada: fotoVelada, nivelRevelado: nivelRevelado,
            reveladoDetenido: reveladoDetenido, nivelFijado: nivelFijado,
            fotoFinalizada: fotoFinalizada, nivelSecado: nivelSecado, fotoSeca: fotoSeca,
            papelX: papelX, papelY: papelY, luzRoja: luzRoja
        };
        localStorage.setItem('estadoCuartoOscuro', JSON.stringify(estadoActual));
    }
}

window.toggleLuz = function() {
    luzRoja = !luzRoja;
    let btn = document.getElementById('btn-luz');
    if (luzRoja) { btn.innerHTML = "🔴 LUZ DE SEGURIDAD (ROJA)"; btn.style.background = "#c0392b"; btn.style.color = "#fff"; } 
    else {
        btn.innerHTML = "💡 LUZ BLANCA ENCENDIDA"; btn.style.background = "#fdfdfd"; btn.style.color = "#111";
        if (fotoFuera && !fotoFinalizada) fotoVelada = true;
    }
}

window.sacarFoto = function() {
    if (!fotoFuera) { fotoFuera = true; document.getElementById('btn-sacar').style.display = 'none'; if (!luzRoja) fotoVelada = true; }
}

window.descargarFoto = function() {
    if (fotoSeca && !fotoVelada) {
        let finalImg = createGraphics(800, 800);
        let tonoFondo = map(nivelRevelado, 0, 200, 250, 70);
        finalImg.background(constrain(tonoFondo, 70, 250)); finalImg.tint(255, constrain(nivelRevelado, 0, 255));
        finalImg.imageMode(CENTER); finalImg.image(fotoLatente, 400, 400, 750, 750); save(finalImg, "Sapiens_Revelado_Final.png");
    }
}

// NUEVO: Función para reiniciar por completo y hacer una nueva foto
window.nuevaFoto = function() {
    localStorage.removeItem('fotoSapiens'); // Borra la foto expuesta
    localStorage.removeItem('estadoCuartoOscuro'); // Limpia la mesa de trabajo
    
    // Reseteamos el cronómetro de la cámara, pero dejamos la foto subida y la caja igual
    let guardado = localStorage.getItem('estadoCamara');
    if (guardado) {
        let data = JSON.parse(guardado);
        data.nivelExposicion = 0;
        data.tiempoExposicionTotal = 0;
        localStorage.setItem('estadoCamara', JSON.stringify(data));
    }
    
    window.location.href = 'index.html'; // Volvemos a la cámara listos para otra toma
}

function mousePressed() { if (fotoFuera && mouseX > papelX - papelTam/2 && mouseX < papelX + papelTam/2 && mouseY > papelY - papelTam/2 && mouseY < papelY + papelTam/2) { arrastrando = true; } }
function mouseDragged() { if (arrastrando && !fotoSeca) { papelX = mouseX; papelY = mouseY; } }
function mouseReleased() {
    arrastrando = false;
    if (fotoFuera && !fotoVelada && !fotoSeca) {
        let snaped = false;
        if (!fotoFinalizada) {
            for (let i = 0; i < cubetas.length; i++) {
                if (dist(papelX, papelY, cubetas[i].x, cubetas[i].y) < 160) { papelX = cubetas[i].x; papelY = cubetas[i].y; snaped = true; }
            }
        }
        if (!snaped && fotoFinalizada) {
            if (dist(papelX, papelY, zonaSecado.x, zonaSecado.y) < 180) { papelX = zonaSecado.x; papelY = zonaSecado.y; }
        }
    }
}
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    centroX = (width / 2) + 150;
    let cY = height - 180;
    if (cubetas.length > 0) { cubetas[0].y = cY; cubetas[1].y = cY; cubetas[2].y = cY; cubetas[0].x = centroX - 280; cubetas[1].x = centroX; cubetas[2].x = centroX + 280; }
    zonaSecado = {x: width - 180, y: 160, w: 280, h: 220};
}