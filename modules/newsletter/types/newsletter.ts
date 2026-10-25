export type SubscribeState = {
  status: "idle" | "success" | "error";
  message: string;
  email?: string; // eco del correo escrito, solo en error
};
