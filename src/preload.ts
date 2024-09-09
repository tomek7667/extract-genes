import { ipcRenderer } from "electron";

export const blockElement = (element: HTMLElement) => {
	element.classList.add("is-disabled");
	element.classList.add("disabled");
	element.classList.add("is-loading");
	if (element instanceof HTMLInputElement) {
		element.disabled = true;
	}
};

export const unblockElement = (element: HTMLElement) => {
	element.classList.remove("is-disabled");
	element.classList.remove("disabled");
	element.classList.remove("is-loading");
	if (element instanceof HTMLInputElement) {
		element.disabled = false;
	}
};

const MAX_LOGS = 200;
let logs: string[] = [];

window.addEventListener("DOMContentLoaded", () => {
	const fileSequencesInput = document.getElementById(
		"sequence-file-input"
	) as HTMLInputElement;
	const fileNamesInput = document.getElementById(
		"names-file-input"
	) as HTMLInputElement;
	const runButton = document.getElementById("run-button") as HTMLButtonElement;
	const clearLogsButton = document.getElementById(
		"clear-logs-button"
	) as HTMLButtonElement;
	const outputCode = document.getElementById("output") as HTMLPreElement;

	const log = (message: string) => {
		const log = "[" + new Date().toLocaleString() + "] " + message + "\n";
		if (logs.length >= MAX_LOGS) {
			logs.shift();
		}
		logs.push(log);
		const reversedArray = logs.slice().reverse();
		outputCode.innerText = reversedArray.join("\n");
	};

	const clearLog = () => {
		outputCode.innerText = "";
		logs = [];
	};

	ipcRenderer.send("getAppVersion");

	ipcRenderer.on("appVersion", (event, appVersion) => {
		document.getElementById("title").innerText = `Extract Genes ${appVersion}`;
	});

	ipcRenderer.on("run", (event, args) => {
		const { success, errorMessage } = args;
		if (!success && errorMessage) {
			alert(errorMessage);
		}
	});

	ipcRenderer.on("log", (event, args) => {
		const { message } = args;
		log(message);
	});

	clearLogsButton.addEventListener("click", () => {
		clearLog();
	});

	runButton.addEventListener("click", () => {
		const fileSequencesFiles = fileSequencesInput.files;
		const fileNamesFile = fileNamesInput.files[0];
		if (!fileSequencesFiles || !fileNamesFile) {
			alert("Please select all files");
			return;
		}
		ipcRenderer.send("run", {
			fileSequencesFiles: Array.from(fileSequencesFiles).map(
				(file) => file.path
			),
			fileNamesFile: fileNamesFile.path,
		});
	});

	fileSequencesInput.addEventListener("change", () => {
		const files = fileSequencesInput.files;
		ipcRenderer.send("log", {
			message: `Selected sequence files: ${Array.from(files)
				.map((file) => file.path)
				.join(", ")}`,
		});
	});

	fileNamesInput.addEventListener("change", () => {
		const file = fileNamesInput.files[0];
		ipcRenderer.send("log", {
			message: `Selected names file: ${file.path}`,
		});
	});
});
