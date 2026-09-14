"""
NEXUS AQUA - Auth Router
Handles: /auth/register, /auth/login, /auth/me
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models import User, UserRole, UserStatus
from app.schemas import RegisterRequest, LoginRequest, TokenResponse, UserPublic
from app.auth import hash_password, verify_password, create_access_token
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Roles that require admin approval before activation
APPROVAL_REQUIRED_ROLES = {UserRole.admin, UserRole.marine_expert}


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user.
    - Sensitive roles (admin, marine_expert) → status=pending until admin approves
    - Other roles → status=active immediately
    """
    # Check for duplicate user_id
    if db.query(User).filter(User.user_id == payload.user_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User ID '{payload.user_id}' is already taken",
        )

    # Check for duplicate email
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email address is already registered",
        )

    # Determine initial status
    role_enum = UserRole(payload.role.value)
    initial_status = (
        UserStatus.pending
        if role_enum in APPROVAL_REQUIRED_ROLES
        else UserStatus.active
    )

    new_user = User(
        user_id=payload.user_id,
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=role_enum,
        status=initial_status,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user with email/user_id + password.
    Returns JWT access token + user info on success.
    """
    # Try matching by email first, then by user_id
    user = (
        db.query(User).filter(User.email == payload.identifier).first()
        or db.query(User).filter(User.user_id == payload.identifier).first()
    )

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if user.status == UserStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending admin approval. Please wait.",
        )

    if user.status == UserStatus.suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Contact administrator.",
        )

    # Update last login timestamp
    user.last_login = datetime.utcnow()
    db.commit()

    # Issue JWT with user_id and role in payload
    token = create_access_token(data={"sub": user.user_id, "role": user.role.value})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserPublic.model_validate(user),
    )


@router.get("/me", response_model=UserPublic)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user
