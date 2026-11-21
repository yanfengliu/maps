import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';

test('the README embeds a described map preview that ships with this checkout',async()=>{
  const readme=new URL('../README.md',import.meta.url);
  const markdown=await readFile(readme,'utf8');
  const images=[...markdown.matchAll(/^!\[([^\]]+)\]\(([^)]+)\)/gm)];
  const preview=images.find(([,alt,path])=>alt.trim() && /^docs\/images\/[^?#]+\.(jpg|jpeg|png|webp|gif|svg)$/i.test(path));
  assert.ok(preview,'embed a map view from docs/images with descriptive alt text');
  const file=await stat(new URL(preview[2],readme));
  assert.ok(file.isFile() && file.size>0 && file.size<=512*1024);
});
