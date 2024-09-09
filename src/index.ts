import { app, BrowserWindow, ipcMain, ipcRenderer } from "electron";
import { existsSync } from "fs";
import path from "path";
import { run } from "./lib";

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require("electron-squirrel-startup")) {
	app.quit();
}

const createWindow = (): void => {
	const mainWindow = new BrowserWindow({
		webPreferences: {
			preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
			nodeIntegration: true,
		},
		icon: path.join(__dirname, "images/favicon.png"),
	});

	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
	// mainWindow.webContents.openDevTools();
};

app.on("ready", createWindow);
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

let sender: Electron.WebContents | null = null;

ipcMain.on("getAppVersion", (event) => [
	event.sender.send("appVersion", app.getVersion()),
]);

ipcMain.on("run", async ({ sender: runSender }, args) => {
	try {
		sender = runSender;
		const { fileSequencesFiles, fileNamesFile } = args as {
			fileSequencesFiles?: string[];
			fileNamesFile?: string;
		};
		log("Run started");
		if (!fileSequencesFiles || !fileNamesFile) {
			log("Please select all files");
			return;
		}
		if (!existsSync(fileNamesFile)) {
			log(`File names file "${fileNamesFile}" does not exist`);
			return;
		}
		if (fileSequencesFiles.some((file) => !existsSync(file))) {
			log(
				`One or more sequence files do not exist: ${fileSequencesFiles
					.filter((file) => !existsSync(file))
					.join(", ")}`
			);
			return;
		}

		await run(fileNamesFile, fileSequencesFiles, log);
		log("Run finished successfully");
	} catch (error) {
		log(`Experienced an error: ${error.message}`);
	}
});

ipcMain.on("log", ({ sender: logSender }, args) => {
	const { message } = args;
	sender = logSender;
	log(message);
});

export const log = (message: string) => {
	if (!sender) {
		console.log(message);
		return;
	}
	sender.send("log", { message });
};
