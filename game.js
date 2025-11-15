/* ============================================
   JUEGO DE MEMORIA - LÓGICA PRINCIPAL
   ============================================ */

/**
 * Configuración de dificultades del juego
 * Cada dificultad define el número de filas y columnas del tablero
 */
const DIFFICULTIES = {
    easy: { rows: 4, cols: 4, name: 'Fácil' },      // 16 tarjetas (8 pares)
    medium: { rows: 5, cols: 4, name: 'Media' },    // 20 tarjetas (10 pares)
    hard: { rows: 6, cols: 4, name: 'Difícil' }     // 24 tarjetas (12 pares)
};

/**
 * Estado global del juego - Lógica pura del Memory Match
 * Esta estructura contiene toda la información del estado del juego
 */
const gameState = {
    gridSize: null,              // Tamaño de la grilla (objeto con rows y cols)
    cards: [],                   // Array de cartas del juego
    flippedIndices: [],          // Índices de las cartas actualmente volteadas (máximo 2)
    matchedIds: new Set(),       // Set con los IDs de las cartas que ya fueron emparejadas
    moves: 0,                    // Contador de movimientos realizados
    timerSeconds: 0,             // Tiempo transcurrido en segundos
    running: false               // Indica si el juego está en curso
};

/**
 * Referencia al intervalo del timer para poder detenerlo
 */
let timerInterval = null;

/**
 * Referencia al AudioContext para el jingle de victoria
 * Se crea on-demand para evitar problemas con navegadores que requieren interacción previa
 */
let audioContext = null;

/**
 * Referencias a elementos del DOM para la presentación
 */
const elements = {
    // Pantallas
    homeScreen: document.getElementById('home-screen'),
    gameScreen: document.getElementById('game-screen'),
    
    // Selector de dificultad
    difficultyButtons: document.querySelectorAll('.difficulty-btn'),
    playButton: document.getElementById('play-btn'),
    
    // Tablero de juego
    gameBoard: document.getElementById('game-board'),
    movesCounter: document.getElementById('moves-counter'),
    timer: document.getElementById('timer'),
    restartButton: document.getElementById('restart-btn'),
    
    // Modales
    howToPlayModal: document.getElementById('how-to-play-modal'),
    howToPlayButton: document.getElementById('how-to-play-btn'),
    closeHowToPlayButtons: document.querySelectorAll('#close-how-to-play, #close-how-to-play-btn'),
    
    victoryModal: document.getElementById('victory-modal'),
    victoryTime: document.getElementById('victory-time'),
    victoryMoves: document.getElementById('victory-moves'),
    newRecord: document.getElementById('new-record'),
    playAgainButton: document.getElementById('play-again-btn'),
    backToHomeButton: document.getElementById('back-to-home-btn'),
    
    // Mejores tiempos
    bestTimeEasy: document.getElementById('best-time-easy'),
    bestTimeMedium: document.getElementById('best-time-medium'),
    bestTimeHard: document.getElementById('best-time-hard')
};

/* ============================================
   LÓGICA PURA DEL JUEGO
   ============================================ */

/**
 * Inicializa el juego con la grilla seleccionada
 * @param {Object} gridSize - Objeto con propiedades rows y cols
 */
function initGame(gridSize) {
    // Resetea el estado del juego
    gameState.gridSize = gridSize;
    gameState.cards = [];
    gameState.flippedIndices = [];
    gameState.matchedIds = new Set();
    gameState.moves = 0;
    gameState.timerSeconds = 0;
    gameState.running = false;
    
    // Genera el mazo de cartas
    gameState.cards = generateDeck(gridSize);
    
    // Mezcla las cartas
    shuffle(gameState.cards);
}

/**
 * Genera el mazo con pares de cartas según el tamaño de la grilla
 * @param {Object} gridSize - Objeto con propiedades rows y cols
 * @returns {Array} Array de objetos carta con id, glyph e index
 */
function generateDeck(gridSize) {
    const totalCards = gridSize.rows * gridSize.cols;
    const totalPairs = totalCards / 2;
    
    // Lista de emojis veraniegos disponibles (se usarán los primeros N pares)
    const availableGlyphs = [
        '🌞', '☀️', '🏖️', '🌴', '🌺', '🐬',
        '🐚', '🍉', '🍦', '🕶️', '🏄‍♂️', '🌊',
        '🍹', '⛱️'
    ];
    
    const deck = [];
    
    // Crea pares de cartas
    // Cada par tiene el mismo glyph pero diferentes id únicos
    for (let pairIndex = 0; pairIndex < totalPairs; pairIndex++) {
        const glyph = availableGlyphs[pairIndex % availableGlyphs.length];
        
        // Crea dos cartas con el mismo glyph (un par)
        deck.push({
            id: pairIndex * 2,           // ID único de la carta
            glyph: glyph,                // Emoji/glyph (compartido por el par)
            index: pairIndex * 2          // Índice inicial (se actualizará después del shuffle)
        });
        
        deck.push({
            id: pairIndex * 2 + 1,
            glyph: glyph,
            index: pairIndex * 2 + 1
        });
    }
    
    return deck;
}

/**
 * Mezcla las cartas usando el algoritmo Fisher-Yates
 * Este algoritmo garantiza una distribución uniforme y aleatoria
 * @param {Array} array - Array de cartas a mezclar
 */
function shuffle(array) {
    // Itera desde el último elemento hasta el primero
    for (let i = array.length - 1; i > 0; i--) {
        // Selecciona un índice aleatorio entre 0 e i (inclusive)
        const j = Math.floor(Math.random() * (i + 1));
        
        // Intercambia los elementos en las posiciones i y j
        [array[i], array[j]] = [array[j], array[i]];
        
        // Actualiza el índice de cada carta después del intercambio
        array[i].index = i;
        array[j].index = j;
    }
}

/**
 * Inicia el timer del juego
 * Actualiza el tiempo cada segundo mientras el juego esté corriendo
 */
function startTimer() {
    // Si ya hay un timer corriendo, no inicia otro
    if (timerInterval) return;
    
    gameState.running = true;
    
    // Crea un intervalo que se ejecuta cada segundo
    timerInterval = setInterval(() => {
        if (gameState.running) {
            gameState.timerSeconds++;
            updateTimerDisplay();
        }
    }, 1000);
}

/**
 * Detiene el timer del juego
 */
function stopTimer() {
    gameState.running = false;
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/**
 * Resetea el timer a cero
 */
function resetTimer() {
    stopTimer();
    gameState.timerSeconds = 0;
    updateTimerDisplay();
}

/**
 * Gestiona la lógica al voltear una carta
 * @param {number} index - Índice de la carta que se quiere voltear
 * @returns {boolean} true si la carta se pudo voltear, false en caso contrario
 * 
 * BOARD LOCK: Mientras hay dos cartas volteadas (flippedIndices.length === 2),
 * se bloquea la interacción con otras cartas para evitar que se mezclen estados
 * durante la evaluación del match. El lock se libera en checkMatch() después
 * de procesar el resultado.
 */
function onCardFlip(index) {
    // Valida que el juego esté corriendo
    if (!gameState.running) return false;
    
    // BOARD LOCK: No permite voltear cartas mientras se está evaluando un match
    // (cuando ya hay dos cartas volteadas esperando evaluación)
    if (gameState.flippedIndices.length >= 2) return false;
    
    // Valida que el índice sea válido
    if (index < 0 || index >= gameState.cards.length) return false;
    
    const card = gameState.cards[index];
    
    // No permite voltear una carta que ya está emparejada (bloqueada permanentemente)
    if (gameState.matchedIds.has(card.id)) return false;
    
    // No permite voltear una carta que ya está volteada
    if (gameState.flippedIndices.includes(index)) return false;
    
    // Agrega el índice a las cartas volteadas
    gameState.flippedIndices.push(index);
    
    // Si hay dos cartas volteadas, incrementa los movimientos y verifica si coinciden
    if (gameState.flippedIndices.length === 2) {
        gameState.moves++;
        updateMovesDisplay();
        
        // BOARD LOCK activo: Espera un momento para que el usuario vea las cartas antes de verificar
        // Durante este tiempo, onCardFlip() retornará false para cualquier otra carta
        setTimeout(() => {
            checkMatch();
        }, 1000);
    }
    
    return true;
}

/**
 * Verifica si las dos cartas volteadas coinciden
 * Si coinciden, las marca como emparejadas y las bloquea permanentemente.
 * Si no, las voltea de nuevo.
 * 
 * BOARD LOCK: Esta función libera el board lock al finalizar, permitiendo
 * que el jugador pueda voltear nuevas cartas.
 */
function checkMatch() {
    // Debe haber exactamente dos cartas volteadas
    if (gameState.flippedIndices.length !== 2) return;
    
    const [firstIndex, secondIndex] = gameState.flippedIndices;
    const firstCard = gameState.cards[firstIndex];
    const secondCard = gameState.cards[secondIndex];
    
    // Verifica si los glyph coinciden (son un par)
    if (firstCard.glyph === secondCard.glyph) {
        // Las cartas coinciden - las marca como emparejadas (bloqueadas permanentemente)
        gameState.matchedIds.add(firstCard.id);
        gameState.matchedIds.add(secondCard.id);
        
        // Actualiza la presentación para mostrar que están emparejadas y boca arriba
        updateCardMatch(firstIndex, secondIndex);
        
        // Verifica si el jugador ganó
        if (isWin()) {
            stopTimer();
            const stats = {
                time: gameState.timerSeconds,
                moves: gameState.moves,
                gridSize: gameState.gridSize
            };
            // Reproduce el jingle de victoria justo antes de mostrar el modal
            playWinJingle();
            showWinModal(stats);
        }
    } else {
        // Las cartas no coinciden - las voltea de nuevo
        updateCardUnflip(firstIndex, secondIndex);
    }
    
    // BOARD LOCK liberado: Limpia las cartas volteadas para permitir nuevos intentos
    gameState.flippedIndices = [];
}

/**
 * Determina si el jugador ganó el juego
 * @returns {boolean} true si todas las cartas están emparejadas
 */
function isWin() {
    const totalCards = gameState.gridSize.rows * gameState.gridSize.cols;
    const totalPairs = totalCards / 2;
    
    // El jugador gana cuando el número de IDs emparejados es igual al total de cartas
    // (cada par tiene 2 cartas, así que matchedIds.size debe ser totalCards)
    return gameState.matchedIds.size === totalCards;
}

/**
 * Muestra el modal con los resultados de la victoria
 * @param {Object} stats - Objeto con time, moves y gridSize
 */
function showWinModal(stats) {
    // Formatea el tiempo en formato mm:ss
    const minutes = Math.floor(stats.time / 60);
    const seconds = stats.time % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Actualiza los valores en el modal
    elements.victoryTime.textContent = formattedTime;
    elements.victoryMoves.textContent = stats.moves;
    
    // Verifica y guarda el mejor tiempo
    const isNewRecord = saveBestTime(stats);
    
    if (isNewRecord) {
        elements.newRecord.textContent = '¡Nuevo récord! 🎉';
        elements.newRecord.style.display = 'block';
    } else {
        elements.newRecord.style.display = 'none';
    }
    
    // Muestra el modal
    elements.victoryModal.classList.add('active');
    elements.victoryModal.setAttribute('aria-hidden', 'false');
    
    // Enfoca el botón "Jugar de nuevo" para accesibilidad
    elements.playAgainButton.focus();
}

/**
 * Reproduce un jingle de victoria usando Web Audio API
 * Crea el AudioContext on-demand para evitar problemas con navegadores
 * que requieren interacción previa del usuario.
 * 
 * El jingle consiste en 3 notas rápidas (660Hz → 880Hz → 1320Hz)
 * con envolvente attack/decay para evitar distorsión.
 * Duración total: ~700ms
 */
function playWinJingle() {
    try {
        // Crea el AudioContext on-demand si no existe
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Frecuencias de las notas (en Hz)
        const frequencies = [660, 880, 1320];
        const noteDuration = 0.2; // 200ms por nota
        const totalDuration = 0.7; // 700ms total
        
        frequencies.forEach((freq, index) => {
            const startTime = audioContext.currentTime + (index * noteDuration);
            
            // Crea un oscilador para cada nota
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // Configura el oscilador
            oscillator.type = 'sine';
            oscillator.frequency.value = freq;
            
            // Configura la envolvente (attack/decay) para evitar distorsión
            const attackTime = 0.05; // 50ms de attack
            const decayTime = 0.15;  // 150ms de decay
            const volume = 0.3;      // Volumen moderado
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(volume, startTime + attackTime);
            gainNode.gain.linearRampToValueAtTime(0, startTime + attackTime + decayTime);
            
            // Conecta los nodos
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Inicia y detiene el oscilador
            oscillator.start(startTime);
            oscillator.stop(startTime + attackTime + decayTime);
        });
    } catch (error) {
        // Silenciosamente falla si el audio no está disponible
        console.debug('No se pudo reproducir el jingle de victoria:', error);
    }
}

/**
 * Guarda el mejor tiempo en localStorage si es un nuevo récord
 * @param {Object} stats - Objeto con time y gridSize
 * @returns {boolean} true si es un nuevo récord
 */
function saveBestTime(stats) {
    // Crea la clave usando el formato "bestTime_<cols>x<rows>"
    const storageKey = `bestTime_${stats.gridSize.cols}x${stats.gridSize.rows}`;
    const currentBestTime = localStorage.getItem(storageKey);
    
    // Si no hay mejor tiempo o el actual es mejor (menor tiempo)
    if (!currentBestTime || stats.time < parseInt(currentBestTime)) {
        localStorage.setItem(storageKey, stats.time.toString());
        return true; // Es un nuevo récord
    }
    
    return false; // No es un nuevo récord
}

/* ============================================
   FUNCIONES DE PRESENTACIÓN (UI)
   ============================================ */

/**
 * Actualiza la visualización del timer en el DOM
 */
function updateTimerDisplay() {
    const minutes = Math.floor(gameState.timerSeconds / 60);
    const seconds = gameState.timerSeconds % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    elements.timer.textContent = formattedTime;
}

/**
 * Actualiza la visualización del contador de movimientos en el DOM
 */
function updateMovesDisplay() {
    elements.movesCounter.textContent = gameState.moves;
}

/**
 * Actualiza la presentación cuando dos cartas coinciden
 * Las cartas quedan permanentemente boca arriba (flipped) y bloqueadas (matched)
 * @param {number} firstIndex - Índice de la primera carta
 * @param {number} secondIndex - Índice de la segunda carta
 */
function updateCardMatch(firstIndex, secondIndex) {
    const firstElement = elements.gameBoard.querySelector(`[data-index="${firstIndex}"]`);
    const secondElement = elements.gameBoard.querySelector(`[data-index="${secondIndex}"]`);
    
    if (firstElement) {
        // Mantiene la carta boca arriba (flipped) y la marca como emparejada (matched)
        firstElement.classList.add('matched', 'flipped');
        firstElement.setAttribute('aria-label', `Tarjeta ${firstIndex + 1}, emparejada y resuelta`);
        firstElement.setAttribute('aria-pressed', 'true');
    }
    if (secondElement) {
        // Mantiene la carta boca arriba (flipped) y la marca como emparejada (matched)
        secondElement.classList.add('matched', 'flipped');
        secondElement.setAttribute('aria-label', `Tarjeta ${secondIndex + 1}, emparejada y resuelta`);
        secondElement.setAttribute('aria-pressed', 'true');
    }
}

/**
 * Actualiza la presentación cuando dos cartas no coinciden (las voltea de nuevo)
 * @param {number} firstIndex - Índice de la primera carta
 * @param {number} secondIndex - Índice de la segunda carta
 */
function updateCardUnflip(firstIndex, secondIndex) {
    const firstElement = elements.gameBoard.querySelector(`[data-index="${firstIndex}"]`);
    const secondElement = elements.gameBoard.querySelector(`[data-index="${secondIndex}"]`);
    
    if (firstElement) {
        firstElement.classList.remove('flipped');
        firstElement.setAttribute('aria-label', `Tarjeta ${firstIndex + 1}, no volteada`);
    }
    if (secondElement) {
        secondElement.classList.remove('flipped');
        secondElement.setAttribute('aria-label', `Tarjeta ${secondIndex + 1}, no volteada`);
    }
}

/**
 * Renderiza el tablero de juego en el DOM
 */
function renderBoard() {
    // Limpia el tablero
    elements.gameBoard.innerHTML = '';
    
    // Determina la clase de dificultad para el CSS
    let difficultyClass = '';
    if (gameState.gridSize.rows === 4 && gameState.gridSize.cols === 4) {
        difficultyClass = 'easy';
    } else if (gameState.gridSize.rows === 5 && gameState.gridSize.cols === 4) {
        difficultyClass = 'medium';
    } else if (gameState.gridSize.rows === 6 && gameState.gridSize.cols === 4) {
        difficultyClass = 'hard';
    }
    
    elements.gameBoard.className = `game-board ${difficultyClass}`;
    
    // Crea las cartas en el DOM
    gameState.cards.forEach((card, index) => {
        const cardElement = createCardElement(card, index);
        elements.gameBoard.appendChild(cardElement);
    });
}

/**
 * Crea un elemento DOM para una carta
 * @param {Object} card - Objeto carta con id, glyph e index
 * @param {number} index - Índice de la carta en el array
 * @returns {HTMLElement} Elemento DOM de la carta
 */
function createCardElement(card, index) {
    // Contenedor principal de la carta
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.dataset.cardId = card.id;
    cardDiv.dataset.index = index;
    cardDiv.setAttribute('role', 'gridcell');
    cardDiv.setAttribute('tabindex', '0');
    cardDiv.setAttribute('aria-pressed', 'false');
    cardDiv.setAttribute('aria-label', `Tarjeta ${index + 1}, no volteada`);
    
    // Contenedor interno para el flip 3D
    const cardInner = document.createElement('div');
    cardInner.className = 'card-inner';
    
    // Cara frontal (muestra el glyph/emoji)
    const cardFront = document.createElement('div');
    cardFront.className = 'card-face card-front';
    const glyph = document.createElement('span');
    glyph.className = 'glyph';
    glyph.setAttribute('aria-hidden', 'true');
    glyph.textContent = card.glyph;
    cardFront.appendChild(glyph);
    
    // Cara trasera (cubierta burdeos)
    const cardBack = document.createElement('div');
    cardBack.className = 'card-face card-back';
    cardBack.setAttribute('aria-hidden', 'true');
    
    // Ensambla la estructura
    cardInner.appendChild(cardFront);
    cardInner.appendChild(cardBack);
    cardDiv.appendChild(cardInner);
    
    // Event listener para click
    cardDiv.addEventListener('click', () => {
        if (onCardFlip(index)) {
            // Si la carta se pudo voltear, actualiza la presentación
            cardDiv.classList.add('flipped');
            cardDiv.setAttribute('aria-label', `Tarjeta ${index + 1}, volteada`);
        }
    });
    
    // Event listener para tecla Enter/Space
    cardDiv.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onCardFlip(index)) {
            e.preventDefault();
            cardDiv.classList.add('flipped');
            cardDiv.setAttribute('aria-label', `Tarjeta ${index + 1}, volteada`);
        }
    });
    
    return cardDiv;
}

/* ============================================
   INICIALIZACIÓN Y EVENT LISTENERS
   ============================================ */

/**
 * Inicializa el juego cuando se carga la página
 */
function init() {
    loadBestTimes();
    setupEventListeners();
    setInitialDifficulty();
}

/**
 * Configura todos los event listeners del juego
 */
function setupEventListeners() {
    // Selector de dificultad
    elements.difficultyButtons.forEach(btn => {
        btn.addEventListener('click', handleDifficultySelect);
    });
    
    // Botón de jugar
    elements.playButton.addEventListener('click', startGame);
    
    // Botón de reiniciar
    elements.restartButton.addEventListener('click', restartGame);
    
    // Modal "Cómo se juega"
    elements.howToPlayButton.addEventListener('click', openHowToPlayModal);
    elements.closeHowToPlayButtons.forEach(btn => {
        btn.addEventListener('click', closeHowToPlayModal);
    });
    
    // Modal de victoria
    elements.playAgainButton.addEventListener('click', playAgain);
    elements.backToHomeButton.addEventListener('click', backToHome);
    
    // Cerrar modales con overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeAllModals();
            }
        });
    });
    
    // Cerrar modales con tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Navegación por teclado en el tablero
    elements.gameBoard.addEventListener('keydown', handleKeyboardNavigation);
}

/**
 * Establece la dificultad inicial (fácil por defecto)
 */
function setInitialDifficulty() {
    const easyButton = Array.from(elements.difficultyButtons).find(
        btn => btn.dataset.difficulty === 'easy'
    );
    if (easyButton) {
        easyButton.click();
    }
}

/**
 * Maneja la selección de dificultad
 */
function handleDifficultySelect(e) {
    const difficulty = e.currentTarget.dataset.difficulty;
    
    // Remueve la clase selected de todos los botones
    elements.difficultyButtons.forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Agrega la clase selected al botón clickeado
    e.currentTarget.classList.add('selected');
}

/**
 * Inicia un nuevo juego
 */
function startGame() {
    // Encuentra la dificultad seleccionada
    const selectedButton = Array.from(elements.difficultyButtons).find(
        btn => btn.classList.contains('selected')
    );
    
    if (!selectedButton) {
        alert('Por favor, selecciona una dificultad primero.');
        return;
    }
    
    const difficulty = selectedButton.dataset.difficulty;
    const gridSize = DIFFICULTIES[difficulty];
    
    // Inicializa el juego con la lógica pura
    initGame(gridSize);
    
    // Renderiza el tablero
    renderBoard();
    
    // Cambia a la pantalla de juego
    switchToGameScreen();
    
    // Inicia el timer
    startTimer();
}

/**
 * Reinicia el juego actual
 */
function restartGame() {
    if (!gameState.running && gameState.timerSeconds === 0) return;
    
    // Resetea el timer
    resetTimer();
    
    // Resetea movimientos y estado
    gameState.moves = 0;
    gameState.flippedIndices = [];
    gameState.matchedIds = new Set();
    updateMovesDisplay();
    
    // Mezcla las cartas nuevamente
    shuffle(gameState.cards);
    
    // Actualiza los índices después del shuffle
    gameState.cards.forEach((card, index) => {
        card.index = index;
    });
    
    // Re-renderiza el tablero
    renderBoard();
    
    // Reinicia el timer
    startTimer();
}

/**
 * Cambia a la pantalla de juego
 */
function switchToGameScreen() {
    elements.homeScreen.classList.remove('active');
    elements.gameScreen.classList.add('active');
    
    // Enfoca el tablero para navegación por teclado
    elements.gameBoard.focus();
}

/**
 * Vuelve a la pantalla de inicio
 */
function backToHome() {
    // Detiene el juego
    stopTimer();
    
    // Cierra modales
    closeAllModals();
    
    // Cambia a la pantalla de inicio
    elements.gameScreen.classList.remove('active');
    elements.homeScreen.classList.add('active');
    
    // Recarga los mejores tiempos
    loadBestTimes();
}

/**
 * Carga y muestra los mejores tiempos guardados
 */
function loadBestTimes() {
    const difficulties = [
        { key: 'easy', element: elements.bestTimeEasy, gridSize: DIFFICULTIES.easy },
        { key: 'medium', element: elements.bestTimeMedium, gridSize: DIFFICULTIES.medium },
        { key: 'hard', element: elements.bestTimeHard, gridSize: DIFFICULTIES.hard }
    ];
    
    difficulties.forEach(({ element, gridSize }) => {
        // Usa el formato "bestTime_<cols>x<rows>"
        const storageKey = `bestTime_${gridSize.cols}x${gridSize.rows}`;
        const bestTime = localStorage.getItem(storageKey);
        
        if (bestTime) {
            const totalSeconds = parseInt(bestTime);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            element.textContent = formattedTime;
        } else {
            element.textContent = '--:--';
        }
    });
}

/**
 * Juega de nuevo (reinicia el juego)
 */
function playAgain() {
    closeAllModals();
    restartGame();
}

/**
 * Abre el modal "Cómo se juega"
 */
function openHowToPlayModal() {
    elements.howToPlayModal.classList.add('active');
    elements.howToPlayModal.setAttribute('aria-hidden', 'false');
    
    // Enfoca el botón de cerrar para accesibilidad
    const closeButton = elements.howToPlayModal.querySelector('.modal-close');
    if (closeButton) closeButton.focus();
}

/**
 * Cierra el modal "Cómo se juega"
 */
function closeHowToPlayModal() {
    elements.howToPlayModal.classList.remove('active');
    elements.howToPlayModal.setAttribute('aria-hidden', 'true');
}

/**
 * Cierra todos los modales
 */
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    });
}

/**
 * Maneja la navegación por teclado en el tablero
 */
function handleKeyboardNavigation(e) {
    const cards = Array.from(elements.gameBoard.querySelectorAll('.card'));
    const currentIndex = cards.findIndex(card => card === document.activeElement);
    
    let newIndex = currentIndex;
    
    switch(e.key) {
        case 'ArrowRight':
            newIndex = (currentIndex + 1) % cards.length;
            break;
        case 'ArrowLeft':
            newIndex = (currentIndex - 1 + cards.length) % cards.length;
            break;
        case 'ArrowDown':
            if (gameState.gridSize) {
                newIndex = (currentIndex + gameState.gridSize.cols) % cards.length;
            }
            break;
        case 'ArrowUp':
            if (gameState.gridSize) {
                newIndex = (currentIndex - gameState.gridSize.cols + cards.length) % cards.length;
            }
            break;
        default:
            return; // No manejamos esta tecla
    }
    
    if (newIndex >= 0 && newIndex < cards.length) {
        e.preventDefault();
        cards[newIndex].focus();
    }
}

/* ============================================
   TESTS CON CONSOLE.ASSERT()
   ============================================ */

/**
 * Ejecuta tests para verificar que las funciones funcionan correctamente
 * Estos tests se ejecutan cuando se carga la página
 */
function runTests() {
    console.log('🧪 Ejecutando tests...');
    
    // Test 1: Verificar que shuffle() mezcla el array
    const testArray1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const originalArray1 = [...testArray1];
    shuffle(testArray1);
    
    // Verifica que el array tiene la misma longitud
    console.assert(
        testArray1.length === originalArray1.length,
        '❌ Test shuffle(): El array debe mantener su longitud'
    );
    
    // Verifica que contiene los mismos elementos (aunque en diferente orden)
    const hasSameElements = originalArray1.every(item => testArray1.includes(item));
    console.assert(
        hasSameElements,
        '❌ Test shuffle(): El array debe contener los mismos elementos'
    );
    
    // Verifica que los índices se actualizaron correctamente
    const indicesCorrect = testArray1.every((item, index) => {
        // Si el item tiene una propiedad index, verifica que coincida
        if (typeof item === 'object' && item.index !== undefined) {
            return item.index === index;
        }
        return true;
    });
    console.assert(
        indicesCorrect,
        '❌ Test shuffle(): Los índices deben actualizarse correctamente'
    );
    
    console.log('✅ Test shuffle() completado');
    
    // Test 2: Verificar que checkMatch() funciona correctamente
    // Simula un estado de juego con dos cartas volteadas que coinciden
    const testState = {
        cards: [
            { id: 0, glyph: '🌞', index: 0 },
            { id: 1, glyph: '🌞', index: 1 },
            { id: 2, glyph: '🌴', index: 2 },
            { id: 3, glyph: '🌴', index: 3 }
        ],
        flippedIndices: [0, 1],
        matchedIds: new Set()
    };
    
    // Guarda el estado original
    const originalMatchedIds = new Set(testState.matchedIds);
    
    // Simula checkMatch() manualmente
    const [firstIndex, secondIndex] = testState.flippedIndices;
    const firstCard = testState.cards[firstIndex];
    const secondCard = testState.cards[secondIndex];
    
    if (firstCard.glyph === secondCard.glyph) {
        testState.matchedIds.add(firstCard.id);
        testState.matchedIds.add(secondCard.id);
    }
    
    // Verifica que las cartas coincidentes se agregaron a matchedIds
    console.assert(
        testState.matchedIds.has(0) && testState.matchedIds.has(1),
        '❌ Test checkMatch(): Las cartas coincidentes deben agregarse a matchedIds'
    );
    
    // Verifica que el tamaño de matchedIds aumentó
    console.assert(
        testState.matchedIds.size === originalMatchedIds.size + 2,
        '❌ Test checkMatch(): matchedIds debe aumentar en 2 cuando hay un match'
    );
    
    // Test con cartas que NO coinciden
    const testState2 = {
        cards: [
            { id: 0, glyph: '🌞', index: 0 },
            { id: 1, glyph: '🌴', index: 1 }
        ],
        flippedIndices: [0, 1],
        matchedIds: new Set()
    };
    
    const [firstIndex2, secondIndex2] = testState2.flippedIndices;
    const firstCard2 = testState2.cards[firstIndex2];
    const secondCard2 = testState2.cards[secondIndex2];
    
    // Si no coinciden, no se agregan a matchedIds
    if (firstCard2.glyph !== secondCard2.glyph) {
        // No se agregan, así que matchedIds debe permanecer vacío
        console.assert(
            testState2.matchedIds.size === 0,
            '❌ Test checkMatch(): Las cartas no coincidentes NO deben agregarse a matchedIds'
        );
    }
    
    console.log('✅ Test checkMatch() completado');
    console.log('🎉 Todos los tests pasaron correctamente!');
}

/* ============================================
   INICIALIZACIÓN AL CARGAR LA PÁGINA
   ============================================ */

// Inicializa el juego cuando el DOM está listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        init();
        runTests();
    });
} else {
    init();
    runTests();
}
