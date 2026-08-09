export type ApiSuccessEnvelope<T> = {
  code: 200;
  data: T;
  message: string;
};

export type ApiErrorEnvelope = {
  code: number;
  data: null;
  message: string;
};

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;
