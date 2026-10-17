using UnrealBuildTool;

public class ShibuyaUnrealTarget : TargetRules
{
    public ShibuyaUnrealTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V7;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_8;
        ExtraModuleNames.Add("ShibuyaRuntime");
    }
}
