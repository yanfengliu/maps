"""Offline checks of the actual native MCP envelopes observed on Unreal 5.8.3."""
import json
import unittest

from mcp_run import UnrealMcp, scene_identity, tool_value


class NativeMcpContractTests(unittest.TestCase):
    def test_probe_identity_detects_actor_deletion_without_depending_on_rhi(self):
        before = {"map": "/Game/Maps/Shibuya", "static_mesh_actor_count": 1, "static_mesh_actors": [{"label": "City_000", "asset": "/Game/City/Mesh.Mesh", "location_cm": [0, 0, 0], "bounds_origin_cm": [10, 20, 30], "bounds_extent_cm": [10, 20, 30], "material_bindings": []}]}
        deleted = {"map": "/Game/Maps/Shibuya", "static_mesh_actor_count": 0, "static_mesh_actors": []}
        self.assertNotEqual(scene_identity(before), scene_identity(deleted))
        before["static_mesh_actors"][0]["material_bindings"] = [{"textures": ["/Game/City/Photo"]}]
        self.assertEqual(scene_identity(before)["static_mesh_actor_count"], 1)

    def test_native_return_value_envelope(self):
        # Captured from the project's real inspect_scene tool, not an assumed MCP shape.
        payload = {"returnValue": '{"engine_version":"5.8.3-58210709+++UE5+Release-5.8","static_mesh_actor_count":2}'}
        response = {"content": [{"type": "text", "text": json.dumps(payload)}]}
        self.assertEqual(tool_value(response)["static_mesh_actor_count"], 2)
        self.assertEqual(tool_value(response)["engine_version"], "5.8.3-58210709+++UE5+Release-5.8")

    def test_native_tool_failure_cannot_be_decoded_as_success(self):
        client = UnrealMcp(18758)
        client.request = lambda *_args, **_kwargs: {"isError": True, "content": [{"type": "text", "text": "source has 1 images but Unreal imported 0 textures"}]}
        with self.assertRaisesRegex(RuntimeError, "imported 0 textures"):
            client.project_tool("build_city")

    def test_mismatched_response_id_is_rejected(self):
        client = UnrealMcp(18758)
        client._send = lambda *_args, **_kwargs: {"jsonrpc": "2.0", "id": 99, "result": {"tools": []}}
        with self.assertRaisesRegex(RuntimeError, "no matching response"):
            client.request("tools/list")

    def test_protocol_error_is_rejected(self):
        client = UnrealMcp(18758)
        client._send = lambda *_args, **_kwargs: {"jsonrpc": "2.0", "id": 1, "error": {"code": -32601, "message": "Unknown method"}}
        with self.assertRaisesRegex(RuntimeError, "Unknown method"):
            client.request("unsupported_method")


if __name__ == "__main__":
    unittest.main()
