// Downloads the Eclipse Java Compiler (EPL-2.0, open source) used to compile in-browser via CheerpJ.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
const V = '3.33.0';
const dest = new URL('../public/ecj.jar', import.meta.url);
if (existsSync(dest)) { console.log('ecj.jar present'); process.exit(0); }
mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
const r = await fetch(`https://repo1.maven.org/maven2/org/eclipse/jdt/ecj/${V}/ecj-${V}.jar`);
if (!r.ok) throw new Error('ecj download failed ' + r.status);
writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
console.log('ecj.jar downloaded');
