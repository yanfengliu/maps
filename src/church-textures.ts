import { publicAsset } from './public-assets.ts';

/** Decode the credited local photographs asynchronously; upload one per frame.
 * Release both textures and pending decodes on exit or context loss. */
export class ChurchTextures {
  private job?: AbortController;
  private images: ImageBitmap[] = [];
  private textures: WebGLTexture[] = [];
  private context?: WebGL2RenderingContext;
  private failure?: string;
  bytes = 0;
  get ready(): boolean { return this.textures.length === 2; }
  private repaint: () => void;
  constructor(repaint: () => void) { this.repaint=repaint; }
  advance(gl: WebGL2RenderingContext): boolean {
    if (this.failure) throw new Error(this.failure);
    if (this.ready) return true;
    this.context = gl;
    if (!this.job) {
      const job = new AbortController(); this.job = job;
      const load = async (path: string) => {
        try {
        const response = await fetch(path, { signal: AbortSignal.any([job.signal,AbortSignal.timeout(15_000)]) });
        if (!response.ok) throw new Error(`Interior artwork returned HTTP ${response.status}.`);
        const bitmap = await createImageBitmap(await response.blob());
        if (this.job !== job) { bitmap.close(); return null; }
        if (bitmap.width > 1280 || bitmap.height > 1280) { bitmap.close(); throw new Error('Interior artwork exceeds its texture budget.'); }
        return bitmap;
        } catch(error) {
          if(this.job===job&&!job.signal.aborted){
            this.failure=`Church artwork could not load. Retry to reopen the interior. ${String(error)}`;
            job.abort();this.repaint();
          }
          throw error;
        }
      };
      void Promise.allSettled(['textures/church-nave.jpg', 'textures/church-chancel.jpg'].map(path => load(publicAsset(path)))).then(results => {
        const images = results.flatMap(r => r.status === 'fulfilled' && r.value ? [r.value] : []);
        if (this.job !== job) { images.forEach(image => image.close()); return; }
        const error = results.find(r => r.status === 'rejected');
        if (error?.status === 'rejected') { images.forEach(image => image.close()); this.failure ??= `Church artwork could not load. Retry to reopen the interior. ${String(error.reason)}`; }
        else this.images = images;
        this.repaint();
      });
      return false;
    }
    const bitmap = this.images.shift();
    if (!bitmap) return false;
    const previous = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;
    const texture = gl.createTexture();
    if (!texture) { bitmap.close(); this.failure='Church artwork texture could not be allocated. Retry to reopen the interior.'; throw new Error(this.failure); }
    try {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
      this.textures.push(texture); this.bytes += bitmap.width * bitmap.height * 4;
    } catch (error) { gl.deleteTexture(texture); this.failure=`Church artwork upload failed. Retry to reopen the interior. ${String(error)}`; throw new Error(this.failure); }
    finally { bitmap.close(); gl.bindTexture(gl.TEXTURE_2D, previous); }
    this.repaint(); return this.ready;
  }
  bind(gl: WebGL2RenderingContext, uniforms: Record<string, WebGLUniformLocation | null>): () => void {
    const active = gl.getParameter(gl.ACTIVE_TEXTURE) as number, previous: (WebGLTexture | null)[] = [];
    this.textures.forEach((texture, index) => {
      gl.activeTexture(gl.TEXTURE0 + index); previous.push(gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null);
      gl.bindTexture(gl.TEXTURE_2D, texture); gl.uniform1i(uniforms[index ? 'u_chancel' : 'u_nave'], index);
    });
    return () => { previous.forEach((texture, index) => { gl.activeTexture(gl.TEXTURE0 + index); gl.bindTexture(gl.TEXTURE_2D, texture); }); gl.activeTexture(active); };
  }
  dispose(): void {
    this.job?.abort(); this.job = undefined;
    this.images.forEach(image => image.close()); this.images = [];
    this.textures.forEach(texture => this.context?.deleteTexture(texture)); this.textures = [];
    this.context = undefined; this.bytes = 0; this.failure = undefined;
  }
}
