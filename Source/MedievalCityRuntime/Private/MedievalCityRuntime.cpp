#include "MedievalCityRuntime.h"

#include "Misc/PackageName.h"

DEFINE_LOG_CATEGORY(LogMedieval);

namespace
{
	const TCHAR* CityMapPackage = TEXT("/Game/Maps/MedievalCity");
}

/**
 * Primary game module.
 *
 * Its one job beyond the default is to say something useful when the town has
 * not been generated yet. Config/DefaultEngine.ini points both the editor
 * startup map and the game default map at /Game/Maps/MedievalCity, which does
 * not exist on a clean checkout, and the engine's own failure for a missing map
 * is a near-empty level with no explanation of how to build it.
 */
class FMedievalCityRuntimeModule : public FDefaultGameModuleImpl
{
public:
	virtual void StartupModule() override
	{
		FDefaultGameModuleImpl::StartupModule();

		if (FPackageName::DoesPackageExist(CityMapPackage))
		{
			return;
		}

		// Warning, not Error: on a clean checkout this is the expected state, and
		// the module loads during prepare_project.py itself, which runs before the
		// level exists. The five commands are the README's sequence; omitting
		// prepare_project.py leaves /Game/Generated/Meshes/ empty and build_level.py
		// then fails.
		UE_LOG(LogMedieval, Warning,
			TEXT("The level %s has not been built yet, so the editor startup map and the game default map ")
			TEXT("cannot load. Build it by running, in order: python tools/blender/build_assets.py, ")
			TEXT("python tools/medieval/build_layout.py, python tools/medieval/build_native.py --target both, ")
			TEXT("python tools/medieval/prepare_project.py, python tools/medieval/build_level.py. ")
			TEXT("Content/ is not tracked in Git, so a fresh checkout always needs all five."),
			CityMapPackage);
	}
};

IMPLEMENT_PRIMARY_GAME_MODULE(FMedievalCityRuntimeModule, MedievalCityRuntime, "MedievalCityRuntime");
