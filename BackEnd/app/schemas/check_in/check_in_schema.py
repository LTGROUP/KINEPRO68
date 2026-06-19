from pydantic import BaseModel


class CheckInRequest(BaseModel):
    qr_value: str


class CheckInResponse(BaseModel):
    message: str
    turno_id: str
    estado: str
