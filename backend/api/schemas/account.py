from pydantic import BaseModel, ConfigDict, Field


class DeleteAccountResponse(BaseModel):
    message: str = Field(
        ...,
        description="Confirmation message for account deletion"
    )

    model_config = ConfigDict(from_attributes=True)
