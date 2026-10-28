#pragma once

#include "CoreMinimal.h"

namespace MedievalSha256
{
	/**
	 * Lower-case hex SHA-256 of a byte buffer, or an empty string when the
	 * platform has no SHA-256 provider.
	 *
	 * FPlatformMisc::GetSHA256Signature is an unimplemented stub on Windows in
	 * UE 5.8 (it calls checkf(false)), so this goes to BCrypt rather than
	 * hand-rolling a hash. tools/medieval/run_probe.py recomputes every digest
	 * with hashlib and fails if the two disagree.
	 */
	FString HashBytes(TArrayView64<const uint8> Bytes);
}
