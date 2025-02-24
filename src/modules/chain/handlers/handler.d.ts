import { Name } from "@wireio/core/lib/core";

export interface ReleventAction<T = any> {
    account: Name;
    name: Name;
    data: T;
}

export interface Handler {
    handleAction: (action: ReleventAction) => void;
}