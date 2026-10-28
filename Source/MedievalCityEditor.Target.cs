using UnrealBuildTool;

public class MedievalCityEditorTarget : TargetRules
{
    public MedievalCityEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V7;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_8;
        ExtraModuleNames.Add("MedievalCityRuntime");
    }
}
