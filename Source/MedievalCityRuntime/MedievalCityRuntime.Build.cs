using UnrealBuildTool;

public class MedievalCityRuntime : ModuleRules
{
    public MedievalCityRuntime(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore",
            "EnhancedInput",
        });

        PrivateDependencyModuleNames.AddRange(new[]
        {
            "ApplicationCore",
            "ImageWrapper",
            "Json",
            "RenderCore",
            "RHI",
        });

        if (Target.Platform == UnrealTargetPlatform.Win64)
        {
            // SHA-256 for probe screenshot digests. FPlatformMisc::GetSHA256Signature is an
            // unimplemented stub on Windows in UE 5.8, so the probe calls BCrypt directly
            // rather than hand-rolling a hash.
            PublicSystemLibraries.Add("bcrypt.lib");
        }
    }
}
