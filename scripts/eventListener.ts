import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DailyAuction } from "../target/types/daily_auction"; // Tipos generados por Anchor

// Configurar la conexión y el provider
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

// Cargar el programa
const smartContract = anchor.workspace.DailyAuction as Program<DailyAuction>;

// Añadir el listener para "MiEvento"
const listener = smartContract.addEventListener("bidPlaced", (event, slot) => {
    console.log("¡Evento recibido!");
    console.log("Slot:", slot);
    console.log("Datos del evento:", event);
    
});

console.log("Servidor escuchando eventos de 'MiEvento'...");

// Para mantener el script corriendo y escuchando
// (esto es solo un ejemplo, en un servidor real usarías algo como Express, etc.)
// process.stdin.resume();

// Para remover el listener cuando ya no lo necesites
// program.removeEventListener(listener);