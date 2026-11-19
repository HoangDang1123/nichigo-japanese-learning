package com.nichigo.api.content;

public interface StrokeAssetStorage {
    byte[] read(String key);
    void putImmutable(String key, byte[] bytes);
}
