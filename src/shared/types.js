"use strict";
/**
 * Shared type definitions for IPC communication between Main and Renderer processes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppErrorCode = exports.IPCChannel = void 0;
var IPCChannel;
(function (IPCChannel) {
    // Backend Management
    IPCChannel["BACKEND_STATUS"] = "backend:status";
    IPCChannel["BACKEND_PORT"] = "backend:port";
    // Window Management
    IPCChannel["WINDOW_MINIMIZE"] = "window:minimize";
    IPCChannel["WINDOW_CLOSE"] = "window:close";
    IPCChannel["WINDOW_SHOW"] = "window:show";
    // System Checks
    IPCChannel["SYSTEM_CHECK_TIME"] = "system:check-time";
    IPCChannel["SYSTEM_CHECK_FILESYSTEM"] = "system:check-filesystem";
    // Health Check
    IPCChannel["HEALTH_CHECK_START"] = "health:start";
    IPCChannel["HEALTH_CHECK_STOP"] = "health:stop";
    IPCChannel["HEALTH_STATUS"] = "health:status";
})(IPCChannel || (exports.IPCChannel = IPCChannel = {}));
var AppErrorCode;
(function (AppErrorCode) {
    AppErrorCode["BACKEND_CRASHED"] = "BACKEND_CRASHED";
    AppErrorCode["FILESYSTEM_NOT_WRITABLE"] = "FILESYSTEM_NOT_WRITABLE";
    AppErrorCode["SYSTEM_TIME_INVALID"] = "SYSTEM_TIME_INVALID";
    AppErrorCode["HEALTH_CHECK_FAILED"] = "HEALTH_CHECK_FAILED";
})(AppErrorCode || (exports.AppErrorCode = AppErrorCode = {}));
