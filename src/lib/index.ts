import {
	FastaSequenceFile,
	FastqSequenceFile,
	GenbankSequencesFile,
	FileExtensionHandler,
	FileExtension,
	ProcessingStatus,
} from "biotech-js";
import { dialog } from "electron";
// import { dialog, shell } from "electron";
import { writeFileSync, readFileSync } from "fs";

export const run = async (
	sequencesNamesFilePath: string,
	sequencesFilesPaths: string[],
	log: (message: string) => void
) => {
	const sequences: {
		name: string;
		sequence: string;
	}[] = [];
	const csv = readFileSync(sequencesNamesFilePath, "utf8")
		.replace(/\r/g, "")
		.split("\n")
		.slice(1)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	const isValid = (description: string) => {
		return csv.some((name) => description.includes(name));
	};

	log(`Loaded ${csv.length} names from ${sequencesNamesFilePath}`);
	if (csv.length === 0) {
		log(
			"No names found in the names file. Exiting - Pleae load a valid CSV file, with only one column."
		);
		return;
	}

	for (let sequenceFilePath of sequencesFilesPaths) {
		const ext = sequenceFilePath.split(".").pop();
		const extension = FileExtensionHandler.fileExtensionToEnum(ext);
		log(
			`Processing file ${sequenceFilePath}. Detected extension: ${extension}`
		);
		switch (extension) {
			case FileExtension.Fasta: {
				const fasta = new FastaSequenceFile(sequenceFilePath);
				await fasta.process();
				log(`File processed with status: ${fasta.processingStatus}`);
				if (fasta.processingStatus === ProcessingStatus.FailedFinished) {
					log(`Error processing file ${sequenceFilePath}. Skipping.`);
					break;
				}
				log(
					`Loaded ${fasta.sequencesNumber} sequences from ${sequenceFilePath}`
				);
				fasta.sequences.forEach(({ sequence, description }) => {
					if (isValid(description)) {
						sequences.push({ name: description, sequence });
					}
				});
				break;
			}
			case FileExtension.Fastq: {
				const fastq = new FastqSequenceFile(sequenceFilePath);
				await fastq.process();
				log(`File processed with status: ${fastq.processingStatus}`);
				if (fastq.processingStatus === ProcessingStatus.FailedFinished) {
					log(`Error processing file ${sequenceFilePath}. Skipping.`);
					break;
				}
				log(
					`Loaded ${fastq.sequencesNumber} sequences from ${sequenceFilePath}`
				);
				fastq.sequences.forEach(
					({ sequence, sequenceIdentifier1, sequenceIdentifier2 }) => {
						if (isValid(sequenceIdentifier1)) {
							sequences.push({ name: sequenceIdentifier1, sequence });
						}
					}
				);

				break;
			}
			case FileExtension.Genbank: {
				const genbank = new GenbankSequencesFile(sequenceFilePath);
				await genbank.process();
				log(`File processed with status: ${genbank.processingStatus}`);
				if (genbank.processingStatus === ProcessingStatus.FailedFinished) {
					log(`Error processing file ${sequenceFilePath}. Skipping.`);
					break;
				}
				log(
					`Loaded ${genbank.sequencesNumber} sequences from ${sequenceFilePath}`
				);
				genbank.sequences.forEach(
					({ Origin: sequence, Locus: { Name: name } }) => {
						if (isValid(name)) {
							sequences.push({ name, sequence });
						}
					}
				);
				break;
			}
			default: {
				log(
					`File extension ${ext} not supported - ${sequenceFilePath}. Skipping.`
				);
				break;
			}
		}
	}

	log(`Found ${sequences.length} sequences with matching names.`);
	const pathToSave = await dialog.showSaveDialog({
		message: "Save the fasta file",
		defaultPath: "sequences.fasta",
		filters: [{ name: "Fasta Files", extensions: ["fasta", "fa"] }],
		buttonLabel: "Save",
		title: "Save Result as a Fasta File",
	});
	if (pathToSave.canceled) {
		log("Save dialog was canceled. Exiting.");
		return;
	}
	saveFastaFile(sequences, pathToSave.filePath);
};

export const saveFastaFile = (
	sequences: { name: string; sequence: string }[],
	filePath: string
) => {
	const content = sequences
		.map((sequence) => {
			let sequenceText = `>${sequence.name}\n`;
			for (let i = 0; i < sequence.sequence.length; i += 60) {
				sequenceText += sequence.sequence.slice(i, i + 60) + "\n";
			}
			return sequenceText;
		})
		.join("");

	writeFileSync(filePath, content);
};
