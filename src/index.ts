import fg from 'fast-glob';
import path from 'node:path';
import fs from 'node:fs/promises';
import dayjs from 'dayjs';
import { extractImageDateTaken } from './metadata/image.js';
import { extractVideoDateTaken } from './metadata/video.js';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff', '.webp', '.bmp', '.heic', '.heif', '.arw', '.cr2', '.nef', '.raf', '.rw2'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.mts', '.m2ts', '.wmv', '.m4v', '.3gp'];

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
				: true;

			if (hasDiscrepancy) {
				const line = [
					file,
					`DateTaken: ${formatDate(taken)}`,
					`Created: ${formatDate(created)}`,
					`Modified: ${formatDate(modified)}`,
				].join(' | ');
				console.log(line);
			}
		} catch (err) {
			console.error(`Error processing ${file}:`, (err as Error).message);
		}
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
