#include "MedievalSha256.h"

#if PLATFORM_WINDOWS
#include "Windows/AllowWindowsPlatformTypes.h"
THIRD_PARTY_INCLUDES_START
#include <bcrypt.h>
THIRD_PARTY_INCLUDES_END
#include "Windows/HideWindowsPlatformTypes.h"
#endif

FString MedievalSha256::HashBytes(TArrayView64<const uint8> Bytes)
{
#if PLATFORM_WINDOWS
	BCRYPT_ALG_HANDLE Algorithm = nullptr;
	if (BCryptOpenAlgorithmProvider(&Algorithm, BCRYPT_SHA256_ALGORITHM, nullptr, 0) != 0)
	{
		return FString();
	}

	uint8 Digest[32] = {};
	const long Status = BCryptHash(
		Algorithm,
		nullptr,
		0,
		const_cast<unsigned char*>(Bytes.GetData()),
		static_cast<unsigned long>(Bytes.Num()),
		Digest,
		sizeof(Digest));
	BCryptCloseAlgorithmProvider(Algorithm, 0);

	if (Status != 0)
	{
		return FString();
	}

	FString Hex;
	Hex.Reserve(64);
	for (int32 Index = 0; Index < 32; ++Index)
	{
		Hex += FString::Printf(TEXT("%02x"), Digest[Index]);
	}
	return Hex;
#else
	return FString();
#endif
}
