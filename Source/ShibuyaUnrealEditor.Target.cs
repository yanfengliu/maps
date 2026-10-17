using UnrealBuildTool;

public class ShibuyaUnrealEditorTarget : TargetRules
{
    public ShibuyaUnrealEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V7;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_8;
        ExtraModuleNames.Add("ShibuyaRuntime");
    }
}
