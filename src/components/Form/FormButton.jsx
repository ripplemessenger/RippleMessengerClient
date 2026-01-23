const FormButton = ({ title, disabled = false, bgColor = 'bg-green-500 hover:bg-green-600' }) => {
  return (
    <button
      type="submit"
      className={`w-96 mt-4 py-2 text-3xl font-bold text-white rounded ${bgColor}`}
      disabled={disabled}
    >
      {title}
    </button>
  )
}

export default FormButton