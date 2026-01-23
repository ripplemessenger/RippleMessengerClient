import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

export default function PortalPage() {

  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
  }, [])

  return (
    <div className="p-1">
    </div >
  )
}