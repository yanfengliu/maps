"""Register project tools with Unreal 5.8's native MCP tool registry."""
import unreal

if unreal.is_editor():
    import shibuya_tools

    shibuya_tools.register()
