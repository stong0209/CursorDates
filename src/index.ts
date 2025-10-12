import fg from 'fast-glob';
import path from 'node:path';
import fs from 'node:fs/promises';
import dayjs from 'dayjs';
import { utimes } from 'utimes';
import { extractImageDateTaken } from './metadata/image.js';
import { extractVideoDateTaken } from './metadata/video.js';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff', '.webp', '.bmp', '.heic', '.heif', '.arw', '.cr2', '.nef', '.raf', '.rw2'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.mts', '.m2ts', '.wmv', '.m4v', '.3gp', '.mpg'];

function isImage(filePath: string): boolean {
	const ext = path.extname(filePath).toLowerCase();
	return IMAGE_EXTENSIONS.includes(ext);
}

function isVideo(filePath: string): boolean {
	const ext = path.extname(filePath).toLowerCase();
	return VIDEO_EXTENSIONS.includes(ext);
}

function formatDate(d: Date | undefined): string {
	return d ? dayjs(d).format('YYYY-MM-DD HH:mm:ss') : 'Unknown';
}

async function getDateTaken(filePath: string): Promise<Date | undefined> {
	if (isImage(filePath)) {
		return await extractImageDateTaken(filePath);
	}
	if (isVideo(filePath)) {
		return await extractVideoDateTaken(filePath);
	}
	return undefined;
}

async function main() {
	const inputDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
	const logFile = process.argv[3] ? path.resolve(process.argv[3]) : null;
	
	// Reset log file if it exists
	if (logFile) {
		await fs.writeFile(logFile, '', 'utf8');
	}

	const patterns = [
		...IMAGE_EXTENSIONS.map((e) => `**/*${e}`),
		...VIDEO_EXTENSIONS.map((e) => `**/*${e}`),
	];

	const files = await fg(patterns, { cwd: inputDir, dot: false, onlyFiles: true, followSymbolicLinks: false, absolute: true, caseSensitiveMatch: false });

	for (const file of files) {
		try {
			const stats = await fs.stat(file);
			const created = stats.birthtime;
			const modified = stats.mtime;
			const taken = await getDateTaken(file);

			const hasDiscrepancy = taken
				? (taken.getTime() !== created.getTime() || taken.getTime() !== modified.getTime())
				: false;

			if (hasDiscrepancy) {
				// Phase1
				const line = [
					file,
					`DateTaken: ${formatDate(taken)}`,
					`Created: ${formatDate(created)}`,
					`Modified: ${formatDate(modified)}`,
				].join(' | ');
				const logLine = `Phase1 : ${line}`;
				console.log(logLine);
				if (logFile) {
					await fs.appendFile(logFile, logLine + '\n', 'utf8');
				}

				// Update created and modified to date taken
				try {
					await utimes(file, {
						btime: taken!,
						mtime: taken!,
						atime: taken!
					});
				} catch (utimesErr) {
					const errorMsg = `Phase1 ERROR: Failed to update timestamps for ${file}: ${(utimesErr as Error).message}`;
					console.error(errorMsg);
					if (logFile) {
						await fs.appendFile(logFile, errorMsg + '\n', 'utf8');
					}
				}
			} else if (!taken && created && modified) {
				// Phase2:
				const line = [
					file,
					`Created: ${formatDate(created)}`,
					`Modified: ${formatDate(modified)}`,
				].join(' | ');
				const logLine = `Phase2 : ${line}`;
				console.log(logLine);
				if (logFile) {
					await fs.appendFile(logFile, logLine + '\n', 'utf8');
				}

				// Update created to modified time
				try {
					await utimes(file, {
						btime: modified,
						mtime: modified,
						atime: modified
					});
				} catch (utimesErr) {
					const errorMsg = `Phase2 ERROR: Failed to update timestamps for ${file}: ${(utimesErr as Error).message}`;
					console.error(errorMsg);
					if (logFile) {
						await fs.appendFile(logFile, errorMsg + '\n', 'utf8');
					}
				}
			}
		} catch (err) {
			const errorMsg = `Error processing ${file}: ${(err as Error).message}`;
			console.error(errorMsg);
			if (logFile) {
				await fs.appendFile(logFile, errorMsg + '\n', 'utf8');
			}
		}
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
