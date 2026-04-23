let sliderEstenopo, sliderFocal, sliderDistancia;
let selectObjeto, inputFoto, fotoUsuario;
let anguloRotacion = 0;

let modoXray = false;
let obturadorAbierto = false;
let nivelExposicion = 0; 
let tiempoExposicionTotal = 0; // Cronómetro real
let modoVistaPrevia = false;
let rotacionActiva = true;

// Animación física de la tapa
let posObturador = 0; 
let mouseSobreUI = false;

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight, WEBGL);
    canvas.parent('canvas-container');

    sliderEstenopo = select('#estenopo');
    sliderFocal = select('#focal');
    sliderDistancia = select('#distancia');
    selectObjeto = select('#objeto-tipo');
    inputFoto = select('#subir-foto');

    let btnXray = select('#btn-xray');
    if (btnXray) {
        btnXray.mousePressed(() => {
            modoXray = !modoXray;
            btnXray.html(modoXray ? "CERRAR CAJA" : "VER INTERIOR (ÓPTICA)");
        });
    }

    selectObjeto.changed(() => { if (selectObjeto.value() === 'imagen') inputFoto.elt.click(); });
    inputFoto.elt.addEventListener('change', (e) => {
        let file = e.target.files[0];
        if (file) {
            let reader = new FileReader();
            reader.onload = function(event) {
                let base64Image = event.target.result;
                fotoUsuario = loadImage(base64Image); // Cargamos la imagen
                try {
                    localStorage.setItem('fotoUsuarioSapiens', base64Image); // La guardamos en memoria
                } catch(err) {
                    console.log("Aviso: Imagen muy pesada para guardarse en caché.");
                }
            };
            reader.readAsDataURL(file);
        }
    });

    // RECUPERAR LA FOTO SUBIDA ANTERIORMENTE
    let fotoGuardada = localStorage.getItem('fotoUsuarioSapiens');
    if (fotoGuardada) {
        fotoUsuario = loadImage(fotoGuardada);
    }

    // Cargar partida guardada
    let guardado = localStorage.getItem('estadoCamara');
    if (guardado) {
        let data = JSON.parse(guardado);
        sliderEstenopo.value(data.estenopo);
        sliderFocal.value(data.focal);
        if(data.distancia) sliderDistancia.value(data.distancia);
        selectObjeto.value(data.objeto);
        select('#iso-papel').value(data.iso);
        nivelExposicion = data.nivelExposicion || 0;
        tiempoExposicionTotal = data.tiempoExposicionTotal || 0;
        modoXray = data.modoXray;
        
        select('#tiempo-exp').html(tiempoExposicionTotal.toFixed(1) + "s");
        if (modoXray) btnXray.html("CERRAR CAJA");
        if (nivelExposicion > 0) {
            select('#btn-ir-cuarto').style('display', 'block');
            select('#feedback').html("Papel con imagen latente.");
        }
    }

    // Bloqueo de cámara interactiva
    setInterval(() => {
        let panel = document.getElementById('panel-ajustes');
        let sidebar = document.getElementById('sidebar-principal');
        let btnXray = document.getElementById('btn-xray');
        let btnPausa = document.getElementById('btn-pausa');
        
        mouseSobreUI = false;
        if (panel && panel.matches(':hover')) mouseSobreUI = true;
        if (sidebar && sidebar.matches(':hover')) mouseSobreUI = true;
        if (btnXray && btnXray.matches(':hover')) mouseSobreUI = true;
        if (btnPausa && btnPausa.matches(':hover')) mouseSobreUI = true;
    }, 100);
}

function draw() {
    background(15);
    if (!mouseSobreUI) orbitControl(2, 2, 0.1); 

    ambientLight(150);
    pointLight(255, 255, 255, -200, -200, 300);

    let d = float(sliderEstenopo.value());
    let f = float(sliderFocal.value());
    select('#val-estenopo').html(d.toFixed(1) + "mm");
    select('#val-focal').html(f + "mm");
    let distObj = float(sliderDistancia.value());
    if (select('#val-distancia')) select('#val-distancia').html(distObj + "mm");

    // LÓGICA DEL TIEMPO Y LA EXPOSICIÓN (Física óptica real)
    if (obturadorAbierto) {
        let iso = float(select('#iso-papel').value());
        tiempoExposicionTotal += deltaTime / 1000;
        
        // FÓRMULA ÓPTICA REAL: (Diámetro² / Focal²) * ISO * Tiempo * ConstanteMágica
        // Con Estenopo 0.5, Focal 250, e ISO 100, la exposición perfecta (150) tarda unos 4 segundos.
        nivelExposicion += ((d * d) / (f * f)) * iso * (deltaTime / 1000) * 10000000;
        
        select('#tiempo-exp').html(tiempoExposicionTotal.toFixed(1) + "s");
    }
    // Animación suave de la tapa (lerp de 0 a 45 píxeles)
    posObturador = lerp(posObturador, obturadorAbierto ? 45 : 0, 0.15);

    // LÓGICA DE ROTACIÓN CONTROLADA
    if (rotacionActiva) {
        anguloRotacion += 0.01;
    } else {
        // Vuelve suavemente a la posición recta (ángulo 0) para mirar al estenopo
        anguloRotacion = lerp(anguloRotacion, 0, 0.1); 
    }

    // 1. OBJETO EXTERIOR
    push();
    translate(-distObj, 0, 0);
    rotateY(HALF_PI);
    dibujarEntidad(false, d);
    pop();

    // 2. CAJA ESTENOPEICA
    push();
    translate(f/2, 0, 0); 
    if (modoXray) {
        noFill(); stroke(255, 255, 255, 80); strokeWeight(1); box(f, 300, 300); 
    } else {
        fill(139, 115, 85); stroke(80, 60, 40); box(f, 300, 300); 
        push(); translate(0, -155, 0); fill(120, 100, 75); box(f + 10, 15, 310); pop();
    }
    pop();

    // 3. EL ESTENOPO Y LA TAPA DESLIZANTE
    push();
    // Placa metálica del agujero
    if (!modoXray) { fill(180); box(4, 60, 60); } 
    else { noFill(); stroke(255, 100); box(4, 60, 60); }
    
    // El agujero físico
    push();
    translate(-3, 0, 0); rotateY(HALF_PI); fill(0); noStroke(); circle(0, 0, d * 5);
    pop();

    // La tapa deslizable que cubre el agujero
    push();
    translate(-4, 0, 0); // Justo por delante de la placa
    rotateY(HALF_PI);
    translate(posObturador, 0, 0); // Movimiento en el eje X
    rectMode(CENTER);
    if (!modoXray) {
        fill(30); stroke(10); strokeWeight(2);
        rect(0, 0, 35, 55, 3); // Tapa negra
    } else {
        noFill(); stroke(200, 150);
        rect(0, 0, 35, 55, 3);
    }
    pop();
    pop(); // Fin estenopo

    // 4. LÓGICA DE RAYOS Y PROYECCIÓN (SOLO SI ESTÁ ABIERTO)
    if (modoXray) {
        let tamO = 75; 
        
        // Mostrar rayos solo si la luz puede entrar
if (obturadorAbierto || modoVistaPrevia) {            
    push();
            let rayos = [
                { p: createVector(-distObj, -tamO, -tamO), col: color(46, 204, 113, 220) }, 
                { p: createVector(-distObj, -tamO, tamO), col: color(46, 204, 113, 220) },  
                { p: createVector(-distObj, tamO, -tamO), col: color(52, 152, 219, 220) },  
                { p: createVector(-distObj, tamO, tamO), col: color(52, 152, 219, 220) }    
            ];
            
            rayos.forEach(rayo => {
                let p = rayo.p; let ratio = f / distObj;
                let destY = -p.y * ratio; let destZ = -p.z * ratio; 
                
                strokeWeight(2); stroke(rayo.col);
                line(p.x, p.y, p.z, f, destY, destZ);
                
                if (d > 0.2) {
                    strokeWeight(1);
                    let disp = d * (f / 35); 
                    let colDisp = color(red(rayo.col), green(rayo.col), blue(rayo.col), 70);
                    stroke(colDisp);
                    line(p.x, p.y, p.z, f, destY + disp, destZ + disp);
                    line(p.x, p.y, p.z, f, destY - disp, destZ - disp);
                    line(p.x, p.y, p.z, f, destY + disp, destZ - disp);
                    line(p.x, p.y, p.z, f, destY - disp, destZ + disp);
                }
            });
            pop();
        }

        // 5. IMAGEN PROYECTADA O QUEMADA EN EL PAPEL
        push();
        translate(f - 1, 0, 0); rotateY(-HALF_PI); 
        fill(20); noStroke(); plane(290, 290); 
        
        translate(0, 0, 1); scale(-1, -1, 1); 
        let escalaImg = f / distObj; scale(escalaImg * 4.5); 
        
        // Si entra la luz se ve en vivo, si está cerrado vemos lo que se haya grabado
        if (obturadorAbierto || modoVistaPrevia) dibujarEntidad(true, d, f, distObj);
    }

    if (frameCount % 30 === 0) {
        let estadoActual = {
            estenopo: d, focal: f, distancia: distObj, objeto: selectObjeto.value(),
            iso: select('#iso-papel').value(), nivelExposicion: nivelExposicion, 
            tiempoExposicionTotal: tiempoExposicionTotal, modoXray: modoXray
        };
        localStorage.setItem('estadoCamara', JSON.stringify(estadoActual));
    }
}

function dibujarEntidad(esProy, d) {
    let tipo = selectObjeto.value();
    if (esProy) noLights(); 
    push();
    if (!esProy) { rotateX(anguloRotacion); rotateY(anguloRotacion); }
    let claridad = esProy ? map(d, 0.1, 5, 255, 80) : 255;
    let tam = esProy ? 150 + (d * 12) : 150; 
    if (tipo === 'imagen' && fotoUsuario) {
        if (esProy) tint(255, claridad); texture(fotoUsuario); plane(tam, tam); if (esProy) noTint();
    } else {
        fill(231, 76, 60, claridad); if (esProy) noStroke();
        if (tipo === 'esfera') esProy ? circle(0,0,tam) : sphere(70);
        else if (tipo === 'caja') esProy ? rect(-tam/2,-tam/2,tam,tam) : box(100);
        else esProy ? (noFill(), stroke(231, 76, 60, claridad), strokeWeight(30 + d*2), circle(0,0,tam)) : torus(70, 25);
    }
    pop();
}

function dibujarImagenQuemada(d, expo) {
    let tipo = selectObjeto.value();
    let oscuridad = constrain(map(expo, 0, 400, 0, 255), 0, 255);
    let tam = 150 + (d * 12); 
    push(); noLights(); fill(0, oscuridad); noStroke(); 
    if (tipo === 'imagen' && fotoUsuario) { 
        tint(0, oscuridad); texture(fotoUsuario); plane(tam, tam); noTint();
    } else {
        if (tipo === 'esfera') circle(0,0,tam); else if (tipo === 'caja') rect(-tam/2,-tam/2,tam,tam);
        else { noFill(); stroke(0, oscuridad); strokeWeight(30 + d*2); circle(0,0,tam); }
    }
    pop();
}

// NUEVA FUNCIÓN INTERRUPTOR
window.toggleObturador = function() {
    obturadorAbierto = !obturadorAbierto;
    let btn = select('#btn-obturador');
    
    if (obturadorAbierto) {
        btn.html("⬛ CERRAR ESTENOPO");
        btn.style('background', '#2ecc71');
        select('#btn-ir-cuarto').style('display', 'none');
        select('#feedback').html("Exponiendo luz en el papel...");
        
        nivelExposicion = 0; 
        tiempoExposicionTotal = 0;
    } else {
        btn.html("🔴 ABRIR ESTENOPO");
        btn.style('background', '#c0392b'); 
        select('#btn-ir-cuarto').style('display', 'block');
        
        let tiempoFinal = tiempoExposicionTotal.toFixed(1);
        let fb = select('#feedback');
        
        // NUEVOS UMBRALES DE LUZ MÁS PRECISOS
        if (nivelExposicion < 80) fb.html("Subexpuesta (Poca luz). Tiempo: " + tiempoFinal + "s");
        else if (nivelExposicion > 250) fb.html("Sobreexpuesta (Quemada). Tiempo: " + tiempoFinal + "s");
        else fb.html("¡Exposición perfecta! (" + tiempoFinal + "s). Ve al cuarto oscuro.");
        
        tiempoExposicionTotal = 0;
        select('#tiempo-exp').html("0.0s");
    }
}

window.toggleVistaPrevia = function() {
    modoVistaPrevia = !modoVistaPrevia;
    let btn = select('#btn-previa');
    
    if (modoVistaPrevia) {
        btn.html("👁️ CERRAR VISTA PREVIA");
        btn.style('background', '#e67e22'); // Naranja más oscuro
    } else {
        btn.html("👁️ VISTA PREVIA (Sin exponer)");
        btn.style('background', '#f39c12'); // Naranja normal
    }
}

window.irAlCuarto = function() {
    let d = float(sliderEstenopo.value()); 
    let f = float(sliderFocal.value()); 
    let distObj = float(sliderDistancia.value());
    let tipo = selectObjeto.value(); 
    
    let bufferFoto = createGraphics(600, 600);
    
    // 1. FÍSICA DEL NEGATIVO (Empezamos en negro, sin luz)
    // Si hay exceso de luz (sobreexposición), la cámara se inunda y el fondo se "vela" (se vuelve gris/blanco)
    let velo = 0;
    if (nivelExposicion > 250) velo = constrain(map(nivelExposicion, 250, 600, 0, 255), 0, 255);
    bufferFoto.background(velo); 
    
    bufferFoto.push(); 
    bufferFoto.translate(300, 300); 
    bufferFoto.scale(-1, -1); 
    
    let escalaOptica = f / distObj; 
    bufferFoto.scale(escalaOptica * 9.3); 
    let tam = 150 + (d * 8); 
    
    // 2. OPACIDAD DE LA LUZ: Si entra poca luz (subexpuesta), la silueta es transparente
    let opacidadLuz = constrain(map(nivelExposicion, 0, 250, 0, 255), 0, 255);
    
    bufferFoto.fill(255, opacidadLuz); // Dibujamos con LUZ BLANCA
    bufferFoto.noStroke();
    
    if (tipo === 'imagen' && fotoUsuario) { 
        bufferFoto.tint(255, opacidadLuz); 
        bufferFoto.imageMode(CENTER); 
        bufferFoto.image(fotoUsuario, 0, 0, tam, tam); 
        bufferFoto.noTint();
    } else { 
        if (tipo === 'esfera') {
            bufferFoto.circle(0, 0, tam); 
        } else if (tipo === 'caja') {
            bufferFoto.rectMode(CENTER);
            bufferFoto.rect(0, 0, tam, tam);
        } else { 
            bufferFoto.noFill(); 
            bufferFoto.stroke(255, opacidadLuz); 
            bufferFoto.strokeWeight(25 + d*3); 
            bufferFoto.circle(0, 0, tam); 
        }
    }
    bufferFoto.pop(); 
    
    // 3. CONVERSIÓN A NEGATIVO FÍSICO (Lo que era luz blanca quema el papel y se vuelve negro)
    bufferFoto.filter(GRAY); 
    bufferFoto.filter(INVERT); 
    
    localStorage.setItem('fotoSapiens', bufferFoto.canvas.toDataURL());
    localStorage.setItem('expoSapiens', nivelExposicion);
    localStorage.removeItem('estadoCuartoOscuro'); 
    window.location.href = "cuarto.html";
}

window.reiniciarCamara = function() { 
    localStorage.clear(); // Borra absolutamente todo (Foto subida, ajustes, cuarto oscuro)
    window.location.reload(); 
}

window.toggleRotacion = function() {
    rotacionActiva = !rotacionActiva;
    let btn = select('#btn-pausa');
    
    if (rotacionActiva) {
        btn.html("⏸️ FRENAR OBJETO");
        btn.style('border-color', '#3498db'); // Borde azul
    } else {
        btn.html("▶️ ROTAR OBJETO");
        btn.style('border-color', '#2ecc71'); // Borde verde
    }
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }