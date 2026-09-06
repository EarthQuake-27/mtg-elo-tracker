# 🃏 Elo del Gruppo — Classifica Elo per Magic: The Gathering

Sito statico, gratuito, ospitato su GitHub Pages, per tenere la classifica Elo
del tuo gruppo di gioco: inserisci i risultati delle partite (2-0, 2-1, 1-1,
1-0, 0-0...), i colori del mazzo usato da ciascun giocatore, e il sito calcola
automaticamente l'Elo di tutti, mostra la classifica generale e le statistiche
individuali di ogni giocatore.

Nessun database, nessun server da pagare: i dati vivono in due semplici file
JSON dentro questo stesso repository (`data/players.json` e
`data/matches.json`), e l'Elo viene ricalcolato al volo nel browser ogni
volta che qualcuno apre il sito.

## Come funziona il calcolo dell'Elo

- Ogni nuovo giocatore parte da **1200** punti Elo (modificabile in
  `assets/js/config.js`).
- Ogni match vale come **una partita di scacchi**: chi vince guadagna punti,
  chi perde ne perde, in base alla differenza di Elo attesa.
- **Pareggio** (1-1 o 0-0): 0.5 punti a testa, nessun vincitore.
- **K-factor**: standard (32) per la maggior parte dei risultati (2-0, 2-1,
  0-2, 1-2, 1-1, 0-0). Per i risultati **corti** (1-0 / 0-1, cioè una sola
  partita giocata) il K-factor è ridotto al **90%**, perché un singolo game
  è meno rappresentativo di un Bo3 completo.
- L'Elo **non è salvato da nessuna parte**: viene ricalcolato da zero ogni
  volta, rigiocando tutto lo storico partite in ordine di data. Questo
  significa che classifica e statistiche sono sempre coerenti, anche se
  correggi un risultato passato.

## Struttura del progetto

```
index.html          → Classifica generale
players.html         → Elenco giocatori + form per aggiungerne di nuovi
player.html          → Statistiche individuali (?id=...)
new-match.html        → Form per registrare una nuova partita
settings.html        → Configurazione del token GitHub (solo per chi inserisce i dati)
assets/css/style.css  → Stile del sito
assets/js/            → Logica (motore Elo, caricamento dati, API GitHub)
data/players.json     → Elenco giocatori
data/matches.json     → Storico partite
```

---

## 1. Provare il sito in locale (prima di pubblicarlo)

Il sito legge i file `data/*.json` con `fetch`, cosa che i browser **bloccano**
se apri i file `.html` direttamente col doppio click (protocollo `file://`).
Serve un piccolo server locale — bastano 10 secondi:

```bash
cd "/Users/federico/Claude/ELO Mtg"
python3 -m http.server 8000
```

Poi apri il browser su **http://localhost:8000**. Va benissimo anche
`npx serve` se preferisci Node.

In locale la scrittura (aggiungere giocatori/partite) funzionerà solo dopo
aver configurato `config.js` e un token come spiegato più sotto — altrimenti
puoi comunque modificare a mano `data/players.json` e `data/matches.json`
per fare qualche prova.

---

## 2. Pubblicare il sito su GitHub Pages (passo passo)

### Passo 1 — Crea un account GitHub (se non ce l'hai già)
Vai su [github.com](https://github.com) e registrati (gratuito).

### Passo 2 — Crea un nuovo repository
1. Clicca su **"New repository"** (in alto a destra, icona **+**).
2. Dai un nome, es. `mtg-elo-tracker`.
3. Impostalo come **Public** (necessario per GitHub Pages gratuito).
4. **Non** aggiungere README/gitignore (li abbiamo già): crea il repository vuoto.

### Passo 3 — Configura il progetto con i tuoi dati
Apri `assets/js/config.js` e modifica queste righe con il **tuo username
GitHub** e il **nome del repository** che hai appena creato:

```js
GITHUB_OWNER: "tuo-username-github",
GITHUB_REPO: "mtg-elo-tracker",
```

Puoi anche cambiare `SITE_NAME` con il nome del tuo gruppo di gioco.

### Passo 4 — Carica il progetto su GitHub
Da terminale, dentro la cartella del progetto:

```bash
cd "/Users/federico/Claude/ELO Mtg"
git init
git add .
git commit -m "Primo commit: Elo del Gruppo"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/mtg-elo-tracker.git
git push -u origin main
```

(Sostituisci `TUO-USERNAME` e `mtg-elo-tracker` con i tuoi valori reali. Se
richiesto, autenticati con le tue credenziali GitHub o un token.)

### Passo 5 — Attiva GitHub Pages
1. Sul repository, vai su **Settings → Pages**.
2. In **"Build and deployment" → "Source"** scegli **"Deploy from a branch"**.
3. In **"Branch"** scegli **`main`** e cartella **`/ (root)`**, poi **Save**.
4. Aspetta 1-2 minuti: GitHub ti mostrerà l'URL pubblico, tipo:
   `https://tuo-username.github.io/mtg-elo-tracker/`

Questo è il link da condividere con i tuoi amici: potranno vedere classifica
e statistiche, ma non modificarle (a meno che tu non dia loro un token, vedi
sotto).

### Passo 6 — Crea il tuo token GitHub (per poter inserire i dati)
Il sito pubblicato è statico: per permettere al form "Nuova Partita" di
salvare davvero i dati nel repository, serve un token personale che solo tu
(o chi inserisce i risultati) userà, direttamente dal browser.

1. Vai su [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
2. In **"Repository access"** scegli **"Only select repositories"** →
   seleziona solo `mtg-elo-tracker`.
3. In **"Permissions" → "Repository permissions"** imposta **"Contents"** su
   **"Read and write"**. Lascia tutto il resto disattivato.
4. Genera il token e **copialo subito** (GitHub lo mostra una sola volta).
5. Vai sul tuo sito pubblicato → **Impostazioni** → incolla il token → **Salva
   token** → **Verifica connessione**.

Il token resta salvato solo nel browser che stai usando in quel momento (nel
suo localStorage): se apri il sito da un altro computer o telefono dovrai
incollarlo di nuovo lì. Non condividerlo con nessuno: chi lo possiede può
modificare i dati del gruppo.

### Passo 7 — Aggiungi i giocatori e le prime partite
1. Vai su **Giocatori** e aggiungi i membri del gruppo.
2. Vai su **Nuova Partita** e inizia a registrare i risultati.
3. Ogni salvataggio crea un **commit automatico** nel repository: puoi
   sempre vedere lo storico completo delle modifiche nella scheda
   **"Commits"** di GitHub.
4. Dopo ogni salvataggio, GitHub Pages impiega di solito **10-60 secondi**
   per ripubblicare il sito con i nuovi dati: se non vedi subito
   l'aggiornamento, aspetta qualche istante e ricarica.

### Passo 8 — Condividi il link
Manda l'URL di GitHub Pages ai tuoi amici: potranno consultare classifica e
statistiche da telefono o computer, in sola lettura. Solo chi ha configurato
un token (in genere solo tu) può inserire nuovi risultati.

---

## Suggerimenti per il futuro

- **Backup**: i tuoi dati sono già al sicuro nello storico Git — ogni
  modifica è un commit recuperabile.
- **Più persone che inseriscono risultati**: puoi generare un token
  fine-grained separato per ogni persona di cui ti fidi, con lo stesso
  permesso "Contents: Read and write" solo su questo repository.
- **Modificare l'Elo iniziale o il K-factor**: cambiali in
  `assets/js/config.js`. Attenzione: essendo l'Elo ricalcolato da zero ogni
  volta, la modifica si applica retroattivamente a tutto lo storico.
- **Correggere un risultato sbagliato**: al momento va modificato a mano nel
  file `data/matches.json` su GitHub (pagina del file → matita per
  modificare → commit). Se vi serve spesso, si può aggiungere in futuro una
  pagina di modifica/cancellazione dedicata.
