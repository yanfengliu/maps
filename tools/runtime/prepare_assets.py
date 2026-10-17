"""Author dependency-free native agent materials in the current Unreal project.

Run with UnrealEditor-Cmd <project> -run=pythonscript -script=<this file>
-unattended -AllowCommandletRendering -RenderOffscreen -d3d12 -nosplash.
Generated /Game/Runtime packages stay ignored. A real shader resource is required.
"""
import unreal


def compile_and_save(result, path):
    errors = unreal.MaterialEditingLibrary.recompile_material(result)
    if errors:
        raise RuntimeError(f'Unreal could not compile {path}: ' + '; '.join(str(error) for error in errors))
    # GetStatistics finishes this actual material resource's compilation. Missing
    # resources and failed shader maps have no representative instructions.
    stats = unreal.MaterialEditingLibrary.get_statistics(result)
    vertex = stats.num_vertex_shader_instructions
    pixel = stats.num_pixel_shader_instructions
    if vertex <= 0 or pixel <= 0:
        raise RuntimeError(f'Unreal has no completed shader resource for {path}: vertex={vertex}, pixel={pixel}; use commandlet rendering with D3D12.')
    unreal.log(f'SHIBUYA_RUNTIME_MATERIAL_SHADER {path} vertex={vertex} pixel={pixel}')
    if not unreal.EditorAssetLibrary.save_loaded_asset(result, False):
        raise RuntimeError(f'Unreal refused to save {path}.')
    return result.get_path_name()


def material(name, roughness, metallic):
    path = '/Game/Runtime/' + name
    existing = unreal.load_asset(path)
    if existing:
        if not isinstance(existing, unreal.Material):
            raise RuntimeError(f'Cannot prepare {path}: existing asset is not a material.')
        result = existing
        # Delete the snapshot: UE5.8's bulk helper removes from its live range
        # during iteration and can leave dangling old expressions behind.
        for expression in list(unreal.MaterialEditingLibrary.get_material_expressions(result)):
            unreal.MaterialEditingLibrary.delete_material_expression(result, expression)
        if unreal.MaterialEditingLibrary.get_num_material_expressions(result) != 0:
            raise RuntimeError(f'Unreal did not clear the old expression graph in {path}.')
    else:
        result = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
            name, '/Game/Runtime', unreal.Material, unreal.MaterialFactoryNew())
    if not result:
        raise RuntimeError(f'Unreal did not create material {path}.')
    channels = []
    for index in range(3):
        channel = unreal.MaterialEditingLibrary.create_material_expression(
            result, unreal.MaterialExpressionPerInstanceCustomData)
        channel.set_editor_property('data_index', index)
        channel.set_editor_property('const_default_value', 0.5)
        channels.append(channel)
    rg = unreal.MaterialEditingLibrary.create_material_expression(
        result, unreal.MaterialExpressionAppendVector)
    rgb = unreal.MaterialEditingLibrary.create_material_expression(
        result, unreal.MaterialExpressionAppendVector)
    for source, target, input_name in ((channels[0], rg, 'A'), (channels[1], rg, 'B'), (rg, rgb, 'A'), (channels[2], rgb, 'B')):
        if not unreal.MaterialEditingLibrary.connect_material_expressions(source, '', target, input_name):
            raise RuntimeError(f'Cannot wire the actual RGB custom instance data in {path}.')
    # Engine BasicShapes are ordinary raster meshes. UE5.8 only reads instance
    # custom data directly in a pixel shader for Nanite; interpolate vertex data
    # explicitly so ordinary instanced meshes receive their actual colours.
    interpolator = unreal.MaterialEditingLibrary.create_material_expression(
        result, unreal.MaterialExpressionVertexInterpolator)
    if not unreal.MaterialEditingLibrary.connect_material_expressions(rgb, '', interpolator, 'VS'):
        raise RuntimeError(f'Cannot interpolate RGB instance data in {path}.')
    unreal.MaterialEditingLibrary.connect_material_property(interpolator, '', unreal.MaterialProperty.MP_BASE_COLOR)
    for value, prop in ((roughness, unreal.MaterialProperty.MP_ROUGHNESS), (metallic, unreal.MaterialProperty.MP_METALLIC)):
        expression = unreal.MaterialEditingLibrary.create_material_expression(result, unreal.MaterialExpressionConstant)
        expression.set_editor_property('r', value)
        unreal.MaterialEditingLibrary.connect_material_property(expression, '', prop)
    unreal.MaterialEditingLibrary.set_material_usage(
        result, unreal.MaterialUsage.MATUSAGE_INSTANCED_STATIC_MESHES)
    if not result.get_editor_property('used_with_instanced_static_meshes'):
        raise RuntimeError(f'Cannot enable the actual instanced-mesh shader usage in {path}.')
    return compile_and_save(result, path)


def main():
    assets = [material('M_AgentMatte', 0.85, 0), material('M_AgentPaint', 0.28, 0.45), material('M_AgentGlass', 0.16, 0.25)]
    unreal.SystemLibrary.execute_console_command(None, 'Editor.AsyncAssetCompilationFinishAll')
    unreal.log('SHIBUYA_RUNTIME_MATERIALS_READY ' + repr(assets))


if __name__ == '__main__':
    main()
