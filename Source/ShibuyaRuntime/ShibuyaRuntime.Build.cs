using UnrealBuildTool;

public class ShibuyaRuntime : ModuleRules
{
    public ShibuyaRuntime(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        bEnableExceptions = true;
        PublicSystemLibraries.Add("bcrypt.lib");
        PublicDependencyModuleNames.AddRange(new[] { "Core", "CoreUObject", "Engine", "InputCore", "ApplicationCore", "Json", "JsonUtilities", "RHI", "RenderCore", "XmlParser" });
    }
}
