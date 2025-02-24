#include <napi.h>
#include <napi-inl.h>

#include <cstdio>
#include <string>
#include <iostream>

#include "../abieos/src/abieos.h"
#include "../abieos/src/abieos.hpp"

using namespace std;

abieos_context* global_context;

std::string json_to_hex(const char *contract_name, const char *type, const char *json)
{
    if(global_context == nullptr) {
        global_context = abieos_create();
    }
    uint64_t contract = abieos_string_to_name(global_context, contract_name);
    bool status = abieos_json_to_bin(global_context, contract, type, json);
    if(!status)
    {
        std::cout << abieos_get_error(global_context) << "\n";
        return "PARSING_ERROR";
    }
    auto results = abieos_get_bin_hex(global_context);
    if(results == nullptr)
    {
        std::cout << abieos_get_error(global_context) << "\n";
        return "ERROR";
    }
    std::string hexValue = &results[0u];
    return hexValue;
}

std::string hex_to_json(const char *contract_name, const char *type, const char *hex)
{
    if(global_context == nullptr) {
        global_context = abieos_create();
    }
    uint64_t contract = abieos_string_to_name(global_context, contract_name);
    auto results = abieos_hex_to_json(global_context, contract, type, hex);
    if(results == nullptr)
    {
        return abieos_get_error(global_context);
    }
    return results;
}

std::string bin_to_json(const char *contract_name, const char *type, const char *bin, int size)
{
    if(global_context == nullptr) {
        global_context = abieos_create();
    }
    uint64_t contract = abieos_string_to_name(global_context, contract_name);
    auto results = abieos_bin_to_json(global_context, contract, type, bin, size);
    if(results == nullptr)
    {
        return abieos_get_error(global_context);
    }
    return results;
}

Napi::String JsonToHexWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    std::string type = info[1].As<Napi::String>().Utf8Value();
    std::string json = info[2].As<Napi::String>().Utf8Value();
    auto returnValue = json_to_hex(&contract_name[0u], &type[0u], &json[0u]);
    return Napi::String::New(env, returnValue);
}

Napi::String HexToJsonWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    std::string type = info[1].As<Napi::String>().Utf8Value();
    std::string hex = info[2].As<Napi::String>().Utf8Value();
    auto returnValue = hex_to_json(&contract_name[0u], &type[0u], &hex[0u]);
    return Napi::String::New(env, returnValue);
}

Napi::String BinToJsonWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    std::string type = info[1].As<Napi::String>().Utf8Value();
    Napi::Buffer buf = info[2].As<Napi::Buffer<char>>();
    auto returnValue = bin_to_json(&contract_name[0u], &type[0u], buf.Data(), buf.Length());
    return Napi::String::New(env, returnValue);
}

uint64_t string_to_name(const char *str)
{
    if(global_context == nullptr) {
        global_context = abieos_create();
    }
    uint64_t result = abieos_string_to_name(global_context, str);
    return result;
}

Napi::BigInt StringToNameWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    // name string
    std::string str_input = info[0].As<Napi::String>().Utf8Value();
    uint64_t returnValue = string_to_name(&str_input[0u]);
    return Napi::BigInt::New(env, returnValue);
}

bool load_abi(const char *contract_name, const char *abi)
{
    if(global_context == nullptr) {
        global_context = abieos_create();
        // std::cout << "[main.cpp] new context created!" << "\n";
    }
    uint64_t contract = abieos_string_to_name(global_context, contract_name);
    abieos_delete_contract(global_context, contract);
    bool abi_status = abieos_set_abi(global_context, contract, abi);
    if(!abi_status) {
        std::cout << "load_abi error on [" << contract_name << "] - " << abieos_get_error(global_context) << "\n";
        return false;
    } else {
        return true;
    }
}

Napi::Boolean LoadAbiWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    std::string abi = info[1].As<Napi::String>().Utf8Value();
    auto returnValue = load_abi(&contract_name[0u], &abi[0u]);
    return Napi::Boolean::New(env, returnValue);
}

bool load_abi_hex(const char *contract_name, const char *hex)
{
    if(global_context == nullptr) {
        global_context = abieos_create();
        // std::cout << "[main.cpp] new context created!" << "\n";
    }
    uint64_t contract = abieos_string_to_name(global_context, contract_name);
    abieos_delete_contract(global_context, contract);
    bool abi_status = abieos_set_abi_hex(global_context, contract, hex);
    if(!abi_status)
    {
        std::cout << "load_abi_hex error on [" << contract_name << "] - " << abieos_get_error(global_context) << "\n";
        return false;
    } else {
        return true;
    }
}

Napi::Boolean LoadAbiHexWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    std::string abi_hex = info[1].As<Napi::String>().Utf8Value();
    auto returnValue = load_abi_hex(&contract_name[0u], &abi_hex[0u]);
    return Napi::Boolean::New(env, returnValue);
}

string get_type_for_action(const char *contract_name, const char *action_name)
{
    if(global_context != nullptr) {
        uint64_t contract = abieos_string_to_name(global_context, contract_name);
        uint64_t action = abieos_string_to_name(global_context, action_name);
        auto result = abieos_get_type_for_action(global_context, contract, action);
        if(result == nullptr) {
            return "NOT_FOUND";
        } else {
            return result;
        }
    } else {
        return "NO_CONTEXT";
    }
}

string get_type_for_table(const char *contract_name, const char *table_name)
{
    if(global_context != nullptr) {
        uint64_t contract = abieos_string_to_name(global_context, contract_name);
        uint64_t table = abieos_string_to_name(global_context, table_name);
        auto result = abieos_get_type_for_table(global_context,contract, table);
        if(result == nullptr) {
            return "NOT_FOUND";
        } else {
            return result;
        }
    } else {
        return "NO_CONTEXT";
    }
}

Napi::String GetTypeWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    std::string action_name = info[1].As<Napi::String>().Utf8Value();
    auto returnValue = get_type_for_action(&contract_name[0u], &action_name[0u]);
    return Napi::String::New(env, returnValue);
}

Napi::String GetTableTypeWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    std::string table_name = info[1].As<Napi::String>().Utf8Value();
    auto returnValue = get_type_for_table(&contract_name[0u], &table_name[0u]);
    return Napi::String::New(env, returnValue);
}

bool delete_contract(const char *contract_name) {
    if(global_context != nullptr) {
        uint64_t contract = abieos_string_to_name(global_context, contract_name);
        return abieos_delete_contract(global_context, contract);
    } else {
        return false;
    }
}

Napi::Boolean DeleteContractWrapped(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    std::string contract_name = info[0].As<Napi::String>().Utf8Value();
    auto returnValue = delete_contract(&contract_name[0u]);
    return Napi::Boolean::New(env, returnValue);
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    exports.Set("string_to_name", Napi::Function::New(env, StringToNameWrapped));
    exports.Set("json_to_hex", Napi::Function::New(env, JsonToHexWrapped));
    exports.Set("hex_to_json", Napi::Function::New(env, HexToJsonWrapped));
    exports.Set("bin_to_json", Napi::Function::New(env, BinToJsonWrapped));
    exports.Set("load_abi", Napi::Function::New(env, LoadAbiWrapped));
    exports.Set("load_abi_hex", Napi::Function::New(env, LoadAbiHexWrapped));
    exports.Set("get_type_for_action", Napi::Function::New(env, GetTypeWrapped));
    exports.Set("get_type_for_table", Napi::Function::New(env, GetTableTypeWrapped));
    exports.Set("delete_contract", Napi::Function::New(env, DeleteContractWrapped));
    return exports;
}

NODE_API_MODULE(abieos,Init);
