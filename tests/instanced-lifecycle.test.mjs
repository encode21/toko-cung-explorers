import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import * as T from "three";
import { WebGLAttributes } from "three/src/renderers/webgl/WebGLAttributes.js";
import { WebGLObjects } from "three/src/renderers/webgl/WebGLObjects.js";

const source = await readFile(
  new URL("../src/game/engine/use-owned-instanced-mesh.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness() {
  const exports = {};
  new Function("require", "exports", compiled)((name) => {
    assert.equal(name, "react");
    return { useRef: (current) => ({ current }), useCallback: (callback) => callback };
  }, exports);
  const [ref, attach] = exports.useOwnedInstancedMesh();
  const buffers = new Set();
  let id = 0;
  const gl = {
    ARRAY_BUFFER: 34962,
    FLOAT: 5126,
    createBuffer() {
      const buffer = { id: ++id };
      buffers.add(buffer);
      return buffer;
    },
    deleteBuffer(buffer) {
      assert.ok(buffers.delete(buffer), "a live buffer is released only once");
    },
    bindBuffer() {},
    bufferData() {},
    bufferSubData() {},
  };
  // Exercise the real renderer's buffer allocation/disposal code; stub only the GL driver.
  const attributes = WebGLAttributes(gl);
  const info = { render: { frame: 0 } };
  const objects = WebGLObjects(
    gl,
    { get: (mesh) => mesh.geometry, update() {} },
    attributes,
    { releaseStatesOfObject() {} },
    info,
  );
  const geometry = new T.BoxGeometry();
  const material = new T.MeshBasicMaterial();
  let sharedDisposals = 0;
  geometry.addEventListener("dispose", () => sharedDisposals++);
  material.addEventListener("dispose", () => sharedDisposals++);
  const mesh = (count = 2) => {
    const result = new T.InstancedMesh(geometry, material, count);
    result.setColorAt(0, new T.Color("red"));
    return result;
  };
  return {
    ref,
    attach,
    buffers,
    attributes,
    mesh,
    sharedDisposals: () => sharedDisposals,
    draw(object) {
      info.render.frame++;
      objects.update(object);
    },
  };
}

test("unmount releases matrix and color buffers without disposing shared assets", () => {
  const h = harness(),
    mesh = h.mesh();
  h.attach(mesh);
  h.draw(mesh);
  assert.equal(h.buffers.size, 2);
  h.attach(null);
  h.attach(null);
  assert.equal(h.ref.current, null);
  assert.equal(h.buffers.size, 0);
  assert.equal(h.sharedDisposals(), 0);
});

test("constructor replacement releases the old mesh without disturbing shared siblings", () => {
  const h = harness(),
    first = h.mesh(),
    sibling = h.mesh(),
    replacement = h.mesh(7);
  h.attach(first);
  h.draw(first);
  h.draw(sibling);
  h.attach(replacement);
  assert.equal(h.attributes.get(first.instanceMatrix), undefined);
  assert.ok(h.attributes.get(sibling.instanceMatrix));
  h.draw(replacement);
  h.attach(replacement);
  assert.equal(h.buffers.size, 4);
  h.attach(null);
  sibling.dispose();
  assert.equal(h.buffers.size, 0);
  assert.equal(h.sharedDisposals(), 0);
});

test("StrictMode detach and reattach rebuilds GPU buffers and retains instance data", () => {
  const h = harness(),
    mesh = h.mesh();
  const transform = new T.Matrix4().makeTranslation(3, 2, 1);
  mesh.setMatrixAt(0, transform);
  h.attach(mesh);
  h.draw(mesh);
  const firstBuffer = h.attributes.get(mesh.instanceMatrix).buffer;
  h.attach(null);
  h.attach(mesh);
  h.draw(mesh);
  assert.notEqual(h.attributes.get(mesh.instanceMatrix).buffer, firstBuffer);
  assert.equal(h.buffers.size, 2);
  const actual = new T.Matrix4();
  mesh.getMatrixAt(0, actual);
  assert.deepEqual(actual.elements, transform.elements);
  h.attach(null);
  assert.equal(h.buffers.size, 0);
  assert.equal(h.sharedDisposals(), 0);
});

test("repeated scene travel does not accumulate per-instance GPU buffers", () => {
  const h = harness();
  for (let trip = 0; trip < 30; trip++) {
    const mesh = h.mesh(20 + trip);
    h.attach(mesh);
    h.draw(mesh);
    assert.equal(h.buffers.size, 2);
    h.attach(null);
    assert.equal(h.buffers.size, 0);
  }
  assert.equal(h.sharedDisposals(), 0);
});
