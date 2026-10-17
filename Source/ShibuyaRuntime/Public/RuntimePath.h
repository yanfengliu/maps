#pragma once
#include <cctype>
#include <string>

namespace Shibuya
{
inline bool SafeRelativePath(const std::string& path)
{
    if(path.empty() || path.front()=='/' || path.find('\\')!=std::string::npos || path.find(':')!=std::string::npos)return false;
    size_t start=0;
    while(start<path.size())
    {
        size_t end=path.find('/',start);if(end==std::string::npos)end=path.size();
        const std::string part=path.substr(start,end-start);
        if(part.empty() || part=="." || part==".." || part.back()=='.' || part.back()==' ')return false;
        for(unsigned char c:part)if(c<32 || c=='<' || c=='>' || c=='"' || c=='|' || c=='?' || c=='*')return false;
        std::string stem=part.substr(0,part.find('.'));for(char& c:stem)c=static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
        if(stem=="CON" || stem=="PRN" || stem=="AUX" || stem=="NUL" || (stem.size()==4 && (stem.substr(0,3)=="COM"||stem.substr(0,3)=="LPT") && stem[3]>='1'&&stem[3]<='9'))return false;
        if(end==path.size())return true;start=end+1;
    }
    return false;
}
inline bool SafeIdentifier(const std::string& id)
{
    if(id.empty() || id.size()>128)return false;
    for(unsigned char c:id)if(!(std::isalnum(c)||c=='-'||c=='_'))return false;
    return true;
}
}
