#include <emscripten.h>
#include <string>
#include <vector>
#include <unordered_map>

using namespace std;

unordered_map<string, vector<string>> adjList;

extern "C" {
    EMSCRIPTEN_KEEPALIVE
    void addEdge(const char* u_cstr, const char* v_cstr) {
        string u(u_cstr);
        string v(v_cstr);
        adjList[u].push_back(v);
    }

    EMSCRIPTEN_KEEPALIVE
    void clearGraph() {
        adjList.clear();
    }

    EMSCRIPTEN_KEEPALIVE
    int hasInteraction(const char* u_cstr, const char* v_cstr) {
        string u(u_cstr);
        string v(v_cstr);
        if (adjList.find(u) != adjList.end()) {
            for (const string& neighbor : adjList[u]) {
                if (u.find(v) != string::npos || v.find(u) != string::npos || neighbor.find(v) != string::npos || v.find(neighbor) != string::npos) {
                    return 1;
                }
            }
        }
        return 0;
    }
}
