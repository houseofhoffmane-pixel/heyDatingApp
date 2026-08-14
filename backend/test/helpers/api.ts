import * as request from 'supertest';
import type { TestApp } from '../setup/test-app';

/**
 * Tiny supertest convenience wrappers. Callers do:
 *   const res = await api.post(t, '/auth/otp/request', { phone_e164 });
 * and get a typed-ish response without re-stating `.set().send().expect()`.
 */

export const api = {
  get(t: TestApp, path: string, token?: string) {
    const req = request(t.app.getHttpServer()).get(`/api/v1${path}`);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  },
  post(t: TestApp, path: string, body: any = {}, token?: string) {
    const req = request(t.app.getHttpServer()).post(`/api/v1${path}`).send(body);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  },
  put(t: TestApp, path: string, body: any = {}, token?: string) {
    const req = request(t.app.getHttpServer()).put(`/api/v1${path}`).send(body);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  },
  patch(t: TestApp, path: string, body: any = {}, token?: string) {
    const req = request(t.app.getHttpServer()).patch(`/api/v1${path}`).send(body);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  },
  delete(t: TestApp, path: string, token?: string, body?: any) {
    const req = request(t.app.getHttpServer()).delete(`/api/v1${path}`);
    if (body) req.send(body);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  },
};
